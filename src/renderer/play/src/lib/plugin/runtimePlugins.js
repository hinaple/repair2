import PluginPointer from "@classes/pluginPointer.svelte";
import { createPluginContext } from "./pluginContext";
import { reportPluginException, reportPluginIssue } from "./pluginReporter";
import { ipcRenderer } from "electron";
import { subscribePluginHMR, safeCallPlugin } from "./pluginManager";

/** @typedef {Map<string, { payloads: Record<string, string>, generation: number }>} RuntimePluginConfigs */

const activeRuntimePlugins = new Map();
/** @type {RuntimePluginConfigs} */
let currentRuntimePluginConfigs = new Map();

function createActivationId(pluginName, generation, localGeneration) {
    const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    return `${pluginName}:${generation}:${localGeneration}:${random}`;
}

function disposeMainRuntimePlugin(runtimeData, pluginName) {
    if (!runtimeData?.mainActivated) return;
    runtimeData.mainActivated = false;
    ipcRenderer
        .invoke("plugin:runtime:deactivate", {
            pluginName,
            activationId: runtimeData.activationId
        })
        .catch((err) =>
            reportPluginException(
                runtimeData.ctx?.plugin ?? { id: pluginName, type: "runtime" },
                "Runtime main plugin deactivation failed.",
                err
            )
        );
}

function disposeRuntimePlugin(runtimeData) {
    const { ctx, disposes = [], pendingRendererCalls } = runtimeData;
    runtimeData.rendererReady = false;

    if (Array.isArray(pendingRendererCalls)) pendingRendererCalls.length = 0;

    try {
        disposes.forEach((dispose) => {
            if (typeof dispose === "function") dispose();
        });
    } catch (err) {
        reportPluginException(ctx.plugin, "Runtime plugin disposer failed.", err);
    }
    ctx.lifecycle.dispose();
}

function callRendererMethod(target, methodName, args) {
    if (!target || target.ctx?.lifecycle?.disposed) return;

    try {
        const result = target.plugin?.renderer?.[methodName]?.(
            ...(Array.isArray(args) ? args : [])
        );
        if (result?.then) {
            result.catch((err) =>
                reportPluginException(target.ctx.plugin, "Runtime renderer method failed.", err)
            );
        }
    } catch (err) {
        reportPluginException(target.ctx.plugin, "Runtime renderer method failed.", err);
    }
}

function flushRendererCallQueue(pluginName, target) {
    if (activeRuntimePlugins.get(pluginName) !== target || target.ctx?.lifecycle?.disposed) {
        target.pendingRendererCalls.length = 0;
        return;
    }

    const calls = target.pendingRendererCalls.splice(0);
    calls.forEach(({ methodName, args }) => {
        if (activeRuntimePlugins.get(pluginName) !== target || target.ctx?.lifecycle?.disposed)
            return;
        callRendererMethod(target, methodName, args);
    });
}

function deactivateRuntimePlugin(pluginName) {
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
    ipcRenderer.send("plugin:runtime:deactivate-all");
    activeRuntimePlugins.clear();
    currentRuntimePluginConfigs.clear();
}

function activateRuntimePlugin(pluginName, payloads, generation) {
    if (!pluginName) return;

    let localGen = 0;

    const isDeadGeneration = (myLocalGen) =>
        localGen !== myLocalGen ||
        generation !== currentRuntimePluginConfigs.get(pluginName)?.generation;

    const hmrUnsub = subscribePluginHMR("runtime", pluginName, ({ api, info }) => {
        async function setup() {
            const myLocalGen = ++localGen;
            const activationId = createActivationId(pluginName, generation, myLocalGen);
            let ctx = null;
            let runtimeData = null;
            try {
                if (isDeadGeneration(myLocalGen)) return;
                ctx = createPluginContext({
                    pluginId: pluginName,
                    pluginType: "runtime"
                });
                if (typeof api === "function") api = await api(); //plugin can be a factory
                if (isDeadGeneration(myLocalGen) || !api) {
                    ctx.lifecycle.dispose?.();
                    return;
                }

                const call = (functionName, attributes, args) => {
                    const targetMethod = api?.[functionName];
                    if (typeof targetMethod !== "function") {
                        reportPluginIssue(
                            ctx.plugin,
                            `Runtime plugin step does not exist: ${functionName}`,
                            `Plugin "${pluginName}" does not define "${functionName}".`
                        );
                        return null;
                    }

                    return safeCallPlugin(ctx, "Plugin function execution failed.", () =>
                        targetMethod({
                            attributes,
                            ctx,
                            ...args
                        })
                    );
                };

                runtimeData = {
                    call,
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

                let main = null;
                if (info.main) {
                    const mainMethods = await ipcRenderer.invoke(
                        "plugin:runtime:activate",
                        pluginName,
                        {
                            activationId,
                            rendererMethods: Object.keys(api?.renderer ?? {}),
                            attributes: payloads
                        }
                    );
                    console.log("MAIN METHODS: ", mainMethods);
                    if (Array.isArray(mainMethods)) runtimeData.mainActivated = true;
                    if (mainMethods)
                        main = Object.fromEntries(
                            mainMethods.map((methodName) => [
                                methodName,
                                (...args) =>
                                    ipcRenderer.invoke("plugin:runtime:to-main", {
                                        pluginName,
                                        activationId,
                                        methodName,
                                        args
                                    })
                            ])
                        );
                }

                if (
                    isDeadGeneration(myLocalGen) ||
                    activeRuntimePlugins.get(pluginName) !== runtimeData
                ) {
                    disposeMainRuntimePlugin(runtimeData, pluginName);
                    disposeRuntimePlugin(runtimeData);
                    if (activeRuntimePlugins.get(pluginName) === runtimeData)
                        activeRuntimePlugins.delete(pluginName);
                    return;
                }

                const activeResult = await call("activate", payloads, { main });
                const tempDisposes = [
                    typeof activeResult === "function" && activeResult,
                    api?.dispose
                ];
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
                    ctx?.plugin ?? { id: pluginName, type: "runtime" },
                    "Runtime plugin activation failed.",
                    err
                );
                disposeMainRuntimePlugin(runtimeData, pluginName);
                if (runtimeData) disposeRuntimePlugin(runtimeData);
                else ctx?.lifecycle.dispose();
                const target = activeRuntimePlugins.get(pluginName);
                if (target?.ctx === ctx) {
                    target.pendingRendererCalls.length = 0;
                    activeRuntimePlugins.delete(pluginName);
                }
            }
        }
        setup();
    });
}

function comparePayloads(p0, p1) {
    const keys0 = Object.keys(p0);
    return keys0.length === Object.keys(p1).length && keys0.every((k) => p0[k] === p1[k]);
}

/**
 * @param {PluginPointer[]} pointers
 * @return {RuntimePluginConfigs}
 */
function pointerToConfig(pointers) {
    return new Map(pointers.map(({ name, payloads }) => [name, { payloads, generation: 0 }]));
}

/** @param {PluginPointer[]} pointers */
export function activateRuntimePlugins(pointers = []) {
    console.log("RUNTIME RESET");
    const tempConfig = pointerToConfig(Array.isArray(pointers) ? pointers : []);
    const removeKeys = new Set(currentRuntimePluginConfigs.keys());
    tempConfig.forEach((config, name) => {
        if (removeKeys.delete(name)) {
            const before = currentRuntimePluginConfigs.get(name);
            config.generation = before.generation;
            if (comparePayloads(config.payloads, before.payloads)) return;
        }
        activateRuntimePlugin(name, config.payloads, ++config.generation);
    });
    removeKeys.forEach(deactivateRuntimePlugin);
    currentRuntimePluginConfigs = tempConfig;
}

export function callRuntimePluginStep(pluginName, step, payloads) {
    const targetPluginData = activeRuntimePlugins.get(pluginName);
    if (!targetPluginData?.rendererReady || !step) return;

    return targetPluginData.call(step, payloads);
}

export function restartRuntimePlugins() {
    activeRuntimePlugins.forEach((runtimeData) => {
        runtimeData.setup();
    });
}

ipcRenderer.on(
    "plugin:runtime:to-renderer",
    (evt, { pluginName, activationId, methodName, args }) => {
        const target = activeRuntimePlugins.get(pluginName);
        if (!target) return;
        if (target.activationId !== activationId) return;
        if (target.ctx?.lifecycle?.disposed) return;
        if (!target.rendererReady) {
            target.pendingRendererCalls.push({ methodName, args });
            return;
        }

        callRendererMethod(target, methodName, args);
    }
);
