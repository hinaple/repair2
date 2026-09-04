import { createPluginContext } from "./pluginContext";
import { reportPluginException, reportPluginWarning } from "./pluginReporter";
import { subscribePluginHMR, safeCallPlugin } from "./pluginManager";
import { ipc } from "../ipc";
import type { Types } from "@shared/projectData/types";
import type { PluginContext } from "@fainthit/repair2-plugin-sdk";
import type { ValidPluginPointer } from "./types";
type PluginPointer = Types.PluginPointer;

type RuntimePluginConfigs = Map<string, { payloads: Record<string, string>; generation: number }>;
type RuntimePluginData = {
  call: (
    functionName: string,
    attributes: Record<string, string | number | null>,
    options?: Record<string, unknown>
  ) => unknown | Promise<unknown>;
  plugin: any;
  ctx: PluginContext;
  activationId: string;
  disposes: ((() => void) | unknown)[];
  mainActivated: boolean;
  rendererReady: boolean;
  pendingRendererCalls: {
    methodName: string;
    args: unknown[];
  }[];
  hmrUnsub: () => void;
  setup: () => void;
};

const activeRuntimePlugins: Map<string, RuntimePluginData> = new Map();
let currentRuntimePluginConfigs: RuntimePluginConfigs = new Map();

function createActivationId(pluginName: string, generation: number, localGeneration: number) {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${pluginName}:${generation}:${localGeneration}:${random}`;
}

function disposeMainRuntimePlugin(runtimeData: RuntimePluginData, pluginName: string) {
  if (!runtimeData?.mainActivated) return;
  runtimeData.mainActivated = false;
  ipc
    .invoke("plugin:runtime:deactivate", {
      pluginName,
      activationId: runtimeData.activationId
    })
    .catch((err) =>
      reportPluginException(
        runtimeData.ctx?.plugin ?? { id: pluginName, type: "runtime" },
        "Runtime main plugin deactivation failed.",
        err,
        {
          type: "plugin-runtime-main-deactivation-error",
          phase: "runtime-main",
          summary: `${pluginName} runtime main deactivation failed`
        }
      )
    );
}

function disposeRuntimePlugin(
  runtimeData: Pick<RuntimePluginData, "ctx" | "disposes" | "pendingRendererCalls">
) {
  const { ctx, disposes = [], pendingRendererCalls } = runtimeData;
  if ("rendererReady" in runtimeData) runtimeData.rendererReady = false;

  if (Array.isArray(pendingRendererCalls)) pendingRendererCalls.length = 0;

  try {
    disposes.forEach((dispose) => {
      if (typeof dispose === "function") dispose();
    });
  } catch (err) {
    reportPluginException(ctx.plugin, "Runtime plugin disposer failed.", err, {
      type: "plugin-runtime-disposer-error",
      phase: "runtime",
      summary: `${ctx.plugin.id} runtime disposer failed`
    });
  }
  ctx.lifecycle.dispose();
}

function callRendererMethod(target: RuntimePluginData, methodName: string, args: unknown[]) {
  if (!target || target.ctx?.lifecycle?.disposed) return;

  try {
    const result = target.plugin?.renderer?.[methodName]?.(...(Array.isArray(args) ? args : []));
    if (result?.then) {
      result.catch((err: unknown) =>
        reportPluginException(target.ctx.plugin, "Runtime renderer method failed.", err, {
          type: "plugin-runtime-renderer-method-error",
          phase: "runtime",
          summary: `${target.ctx.plugin.id} runtime renderer method failed`
        })
      );
    }
  } catch (err) {
    reportPluginException(target.ctx.plugin, "Runtime renderer method failed.", err, {
      type: "plugin-runtime-renderer-method-error",
      phase: "runtime",
      summary: `${target.ctx.plugin.id} runtime renderer method failed`
    });
  }
}

function flushRendererCallQueue(pluginName: string, target: RuntimePluginData) {
  if (activeRuntimePlugins.get(pluginName) !== target || target.ctx?.lifecycle?.disposed) {
    target.pendingRendererCalls.length = 0;
    return;
  }

  const calls = target.pendingRendererCalls.splice(0);
  calls.forEach(({ methodName, args }) => {
    if (activeRuntimePlugins.get(pluginName) !== target || target.ctx?.lifecycle?.disposed) return;
    callRendererMethod(target, methodName, args);
  });
}

function deactivateRuntimePlugin(pluginName: string) {
  const runtimeData = activeRuntimePlugins.get(pluginName);
  if (!runtimeData) return;
  runtimeData.hmrUnsub?.();
  disposeMainRuntimePlugin(runtimeData, pluginName);
  disposeRuntimePlugin(runtimeData);
  activeRuntimePlugins.delete(pluginName);
}

export function deactivateAll() {
  activeRuntimePlugins.forEach((runtimeData) => {
    const { hmrUnsub } = runtimeData;
    disposeRuntimePlugin(runtimeData);
    hmrUnsub?.();
  });
  ipc.send("plugin:runtime:deactivate-all");
  activeRuntimePlugins.clear();
  currentRuntimePluginConfigs.clear();
}

function activateRuntimePlugin(
  pluginName: string,
  payloads: Record<string, string | number>,
  generation: number
) {
  if (!pluginName) return;

  let localGen = 0;

  const isDeadGeneration = (myLocalGen: number) =>
    localGen !== myLocalGen ||
    generation !== currentRuntimePluginConfigs.get(pluginName)?.generation;

  const hmrUnsub = subscribePluginHMR("runtime", pluginName, "default", ({ api: source, info }) => {
    async function setup() {
      const myLocalGen = ++localGen;
      const activationId = createActivationId(pluginName, generation, myLocalGen);
      let ctx: PluginContext;
      let runtimeData: RuntimePluginData;
      try {
        if (isDeadGeneration(myLocalGen)) return;
        ctx = createPluginContext({
          pluginId: pluginName,
          pluginType: "runtime"
        });
        const api = typeof source === "function" ? await source() : source;
        if (isDeadGeneration(myLocalGen) || !api) {
          ctx.lifecycle.dispose?.();
          return;
        }

        runtimeData = {
          call(functionName, attributes, options) {
            const targetMethod = api?.[functionName];
            if (typeof targetMethod !== "function") {
              reportPluginWarning(
                ctx.plugin,
                [`Runtime plugin "${pluginName}" does not define "${functionName}".`],
                {
                  type: "plugin-runtime-step-missing",
                  phase: "runtime"
                }
              );
              return null;
            }

            return safeCallPlugin(
              ctx,
              "Plugin function execution failed.",
              () =>
                targetMethod({
                  attributes,
                  ctx,
                  ...options
                }),
              null,
              {
                type: "plugin-runtime-step-error",
                phase: "runtime",
                summary: `${pluginName} runtime step failed`
              }
            );
          },
          plugin: api,
          ctx,
          activationId,
          disposes: [],
          mainActivated: false,
          rendererReady: false,
          pendingRendererCalls: [],
          hmrUnsub,
          setup
        };
        const previous = activeRuntimePlugins.get(pluginName);
        if (previous) {
          disposeMainRuntimePlugin(previous, pluginName);
          disposeRuntimePlugin(previous);
          if (hmrUnsub !== previous.hmrUnsub) previous.hmrUnsub?.();
        }
        activeRuntimePlugins.set(pluginName, runtimeData);

        let main: Record<string, (...args: unknown[]) => Promise<unknown>> | null = null;
        if (info.main) {
          const mainMethods = await ipc.invoke("plugin:runtime:activate", pluginName, {
            activationId,
            rendererMethods: Object.keys(api?.renderer ?? {}),
            attributes: payloads
          });
          if (Array.isArray(mainMethods)) runtimeData.mainActivated = true;
          if (mainMethods)
            main = Object.fromEntries(
              mainMethods.map((methodName) => [
                methodName,
                (...args: unknown[]) =>
                  ipc.invoke("plugin:runtime:to-main", {
                    pluginName,
                    activationId,
                    methodName,
                    args
                  })
              ])
            );
        }

        if (isDeadGeneration(myLocalGen) || activeRuntimePlugins.get(pluginName) !== runtimeData) {
          disposeMainRuntimePlugin(runtimeData, pluginName);
          disposeRuntimePlugin(runtimeData);
          if (activeRuntimePlugins.get(pluginName) === runtimeData)
            activeRuntimePlugins.delete(pluginName);
          return;
        }

        const activeResult = await runtimeData.call("activate", payloads, { main });
        const tempDisposes = [typeof activeResult === "function" && activeResult, api?.dispose];
        if (isDeadGeneration(myLocalGen)) {
          disposeMainRuntimePlugin(runtimeData, pluginName);
          disposeRuntimePlugin({
            ctx,
            disposes: tempDisposes,
            pendingRendererCalls: runtimeData.pendingRendererCalls
          });
          if (activeRuntimePlugins.get(pluginName) === runtimeData)
            activeRuntimePlugins.delete(pluginName);
          return;
        }
        runtimeData.disposes = tempDisposes;
        runtimeData.rendererReady = true;
        flushRendererCallQueue(pluginName, runtimeData);
      } catch (err) {
        reportPluginException(
          ctx!?.plugin ?? { id: pluginName, type: "runtime" },
          "Runtime plugin activation failed.",
          err,
          {
            type: "plugin-runtime-activation-error",
            phase: "runtime",
            summary: `${pluginName} runtime activation failed`
          }
        );
        if (runtimeData!) {
          disposeRuntimePlugin(runtimeData);
          disposeMainRuntimePlugin(runtimeData, pluginName);
        } else if (ctx!) {
          ctx?.lifecycle.dispose();
          const target = activeRuntimePlugins.get(pluginName);
          if (target?.ctx === ctx) {
            target.pendingRendererCalls.length = 0;
            activeRuntimePlugins.delete(pluginName);
          }
        }
      }
    }
    setup();
  });
}

function comparePayloads(p0: Record<string, any>, p1: Record<string, any>): boolean {
  const keys0 = Object.keys(p0);
  return keys0.length === Object.keys(p1).length && keys0.every((k) => p0[k] === p1[k]);
}

function pointerToConfig(pointers: PluginPointer[]): RuntimePluginConfigs {
  return new Map(
    pointers
      .filter((p): p is ValidPluginPointer => !!p.name)
      .map(({ name, payloads }) => [name, { payloads, generation: 0 }])
  );
}

export function activateRuntimePlugins(pointers: PluginPointer[] = [], forceRestart = false) {
  const tempConfig = pointerToConfig(Array.isArray(pointers) ? pointers : []);
  const removeKeys = new Set(currentRuntimePluginConfigs.keys());
  tempConfig.forEach((config, name) => {
    if (removeKeys.delete(name)) {
      const before = currentRuntimePluginConfigs.get(name)!;
      config.generation = before.generation;
      if (comparePayloads(config.payloads, before.payloads)) {
        if (forceRestart) activeRuntimePlugins.get(name)?.setup();
        return;
      }
    }
    activateRuntimePlugin(name, config.payloads, ++config.generation);
  });
  removeKeys.forEach(deactivateRuntimePlugin);
  currentRuntimePluginConfigs = tempConfig;
}

export function callRuntimePluginStep(
  pluginName: string,
  step: string,
  payloads: Record<string, string | number | null>
): unknown | Promise<unknown> {
  const targetPluginData = activeRuntimePlugins.get(pluginName);
  if (!targetPluginData?.rendererReady || !step) return;

  return targetPluginData.call(step, payloads);
}

export function restartRuntimePlugins() {
  activeRuntimePlugins.forEach((runtimeData) => {
    runtimeData.setup();
  });
}

ipc.on("plugin:runtime:to-renderer", (evt, { pluginName, activationId, methodName, args }) => {
  const target = activeRuntimePlugins.get(pluginName);
  if (!target) return;
  if (target.activationId !== activationId) return;
  if (target.ctx?.lifecycle?.disposed) return;
  if (!target.rendererReady) {
    target.pendingRendererCalls.push({ methodName, args });
    return;
  }

  callRendererMethod(target, methodName, args);
});
