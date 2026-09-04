import { getProject } from "../../project";
import { reportPluginException } from "./pluginReporter";
import { dynamicImportPlugin } from "./pluginImport";
import { setStyleForce } from "./pluginStyles";
import { ipc } from "../ipc";
import { deactivateAll } from "./runtimePlugins";
import { createPluginContext } from "./pluginContext";
import {
  PLUGIN_TYPES,
  type PluginList,
  type PluginRendererInfo,
  type PluginSingleUpdate,
  type PluginType
} from "@shared/plugin.types";
import type { PluginContext } from "@fainthit/repair2-plugin-sdk";

type RendererPluginData = {
  info: PluginRendererInfo;
  imported: any;
  importing?: Promise<any> | null;
};
type PluginHmrCallback = (payload: { api: any; info: PluginRendererInfo }) => any;
type PluginHmrSubscriber = (api: any, info: PluginRendererInfo) => any;

const plugins: Record<PluginType, Record<string, RendererPluginData>> = Object.fromEntries(
  PLUGIN_TYPES.map((t) => [t, {}])
) as Record<PluginType, {}>;

async function requestUpdatePluginList() {
  await ipc.invoke("plugin:get-list").then(updateAllPlugin);
}

function updateAllPlugin(pluginList: PluginList, forceImports: string[] = []) {
  PLUGIN_TYPES.forEach((t) => {
    plugins[t] = Object.fromEntries(
      Object.entries(plugins[t]).filter(([name]) => pluginList[name]?.type === t)
    );
  });
  return Promise.all(
    Object.values(pluginList).map((pluginInfo) =>
      updatePlugin(pluginInfo, forceImports.includes(pluginInfo.name))
    )
  );
}

function resolveExportName(pluginApi: any, exportName: string | null = "default") {
  if (!pluginApi) return null;

  if (!exportName || typeof exportName !== "string" || !exportName.trim()) exportName = "default";

  if (!(exportName in pluginApi)) return null;

  return pluginApi[exportName];
}

function importPlugin(pluginData: RendererPluginData) {
  pluginData.importing = dynamicImportPlugin(pluginData.info.distFile)
    .then((p) => {
      if (plugins[pluginData.info.type][pluginData.info.name] !== pluginData)
        return { _expired: true };

      pluginData.importing = null;
      pluginData.imported = p;
      console.log("PLUGIN LOADED: ", pluginData.info.name);
      if (ipc.sendSync("config:is-dev")) {
        const unexported = Object.keys(pluginData.info.exports).filter((e) => !(e in p));
        if (unexported.length)
          reportPluginException(
            { id: pluginData.info.name, type: pluginData.info.type },
            `Exports missing.`,
            { missingExports: unexported },
            {
              type: "plugin-exports-missing",
              phase: "exports",
              summary: `Exports ${unexported
                .map((e) => `"${e}"`)
                .join(", ")} ${unexported.length === 1 ? "is" : "are"} missing.`
            },
            true
          );
      }
      callHmr(pluginData.info, p);
      return p;
    })
    .catch((err) => {
      if (plugins[pluginData.info.type][pluginData.info.name] === pluginData) {
        pluginData.importing = null;
        pluginData.imported = null;
      }

      reportPluginException(
        { id: pluginData.info.name, type: pluginData.info.type },
        "Plugin importing failed.",
        err,
        {
          type: "plugin-import-error",
          phase: "import",
          summary: `${pluginData.info.name} import failed`
        },
        true
      );
      return null;
    });
}
function updatePlugin(pluginInfo: PluginRendererInfo, forceImport: boolean = false) {
  if (!forceImport && plugins[pluginInfo.type][pluginInfo.name]) {
    plugins[pluginInfo.type][pluginInfo.name].info = pluginInfo;
    return getPlugin(pluginInfo.type, pluginInfo.name);
  }

  if (!pluginInfo.ready) return;

  const tempData = { info: pluginInfo, imported: null };
  console.log("LOADING PLUGIN: ", pluginInfo.name);
  importPlugin(tempData);

  plugins[pluginInfo.type][pluginInfo.name] = tempData;
  return getPlugin(pluginInfo.type, pluginInfo.name);
}
export async function getPlugin(
  type: PluginType,
  pluginName: string,
  exportName: string | null = "default"
) {
  let result = null;
  do {
    const target = plugins[type][pluginName];
    if (!target) return null;
    if (target.imported) {
      result = target.imported;
      break;
    }
    result = await target.importing;
    if (!result?._expired) break;
  } while (true);
  return resolveExportName(result, exportName);
}

let pluginImported = false;
let pluginImporting: Promise<unknown>;
export function afterPluginImported() {
  if (pluginImported) return Promise.resolve();
  if (!pluginImporting)
    pluginImporting = requestUpdatePluginList().then(() => (pluginImported = true));

  return pluginImporting;
}

export function safeCallPlugin(
  ctx: PluginContext,
  title: string,
  callback: () => void | Promise<unknown>,
  onerror: ((err: any) => void) | null = null,
  logOptions = {}
) {
  try {
    const result = callback();
    if (result?.then)
      return result.catch((err) => {
        reportPluginException(ctx.plugin, title, err, logOptions);
        return onerror?.(err);
      });
    return result;
  } catch (err) {
    reportPluginException(ctx.plugin, title, err, logOptions);
    return onerror?.(err);
  }
}

export async function callFunctionPlugin({
  name,
  exportName = null,
  contextOptions = {},
  argument = null
}: {
  name: string;
  exportName: string | null;
  contextOptions?: {};
  argument: Record<string, any> | null;
}) {
  if (!name) return;

  let fn = await getPlugin("function", name, exportName);

  if (fn && "function" in fn) fn = fn.function;
  if (typeof fn !== "function") return null;

  const ctx = createPluginContext({
    pluginId: name,
    pluginType: "function",
    ...contextOptions
  });
  return safeCallPlugin(
    ctx,
    "Plugin function execution failed.",
    () => fn({ ctx, ...argument }),
    null,
    {
      type: "plugin-function-error",
      phase: "runtime",
      summary: `${name} function execution failed`
    }
  );
}

const hmrSubscribers: Partial<Record<PluginType, Record<string, Set<PluginHmrSubscriber>>>> = {};

export function subscribePluginHMR(
  type: PluginType,
  pluginName: string,
  exportName: string | null = "default",
  callback: PluginHmrCallback
) {
  const source = { id: pluginName, type: type };

  if (!hmrSubscribers[type]) hmrSubscribers[type] = {};
  let targetSet = hmrSubscribers[type][pluginName];
  if (!targetSet) {
    targetSet = new Set();
    hmrSubscribers[type][pluginName] = targetSet;
  }
  const fn = async (api: any, info: PluginRendererInfo) => {
    try {
      callback({ api: resolveExportName(api, exportName), info });
    } catch (err) {
      reportPluginException(source, "Plugin HMR callback failed.", err, {
        type: "plugin-hmr-error",
        phase: "hmr",
        summary: `${pluginName} HMR callback failed`
      });
    }
  };

  let unsubscribed = false;
  getPlugin(type, pluginName, exportName)
    .then((pluginApi) => {
      if (!unsubscribed && pluginApi)
        callback({ api: pluginApi, info: plugins[type][pluginName].info });
    })
    .catch((err) =>
      reportPluginException(source, "Plugin HMR initial callback failed.", err, {
        type: "plugin-hmr-error",
        phase: "hmr",
        summary: `${pluginName} HMR initial callback failed`
      })
    );

  targetSet.add(fn);
  return () => {
    unsubscribed = true;
    targetSet.delete(fn);
  };
}

async function callHmr(pluginInfo: PluginRendererInfo, plugin: any) {
  const targetSet = hmrSubscribers[pluginInfo.type]?.[pluginInfo.name];
  if (!targetSet) return;
  targetSet.forEach((callback) => {
    Promise.resolve()
      .then(() => callback(plugin, pluginInfo))
      .catch((err) => {
        reportPluginException(
          { id: pluginInfo.name, type: pluginInfo.type },
          "Plugin HMR subscriber failed.",
          err,
          {
            type: "plugin-hmr-error",
            phase: "hmr",
            summary: `${pluginInfo.name} HMR subscriber failed`
          }
        );
      });
  });
}

ipc.on(
  "plugin:hmr",
  async (_: any, { info, cssCode }: { info: PluginRendererInfo; cssCode?: string }) => {
    if (!getProject().data.config.devMode) return;
    if (cssCode && (info.type === "element" || info.type === "frame")) {
      console.log("Plugin CSS HMR:", info.name);
      setStyleForce(info.type, info.name, cssCode);
      return;
    }
    console.log("Plugin HMR:", info.name);
    updatePlugin(info, !info.error);
  }
);

ipc.on("plugin:list", (_, updateData: { plugins: PluginList; buildChanges: string[] }) => {
  updateAllPlugin(updateData.plugins, updateData.buildChanges);
});

ipc.on("plugin:update", (_, update) => {
  const { info, previous, buildChanged }: PluginSingleUpdate = update;
  if (previous && (info.name !== previous.name || info.type !== previous.type)) {
    if (info.type === previous.type && plugins[info.type][info.name])
      plugins[info.type][info.name] = plugins[previous.type]?.[previous.name];
    delete plugins[previous.type]?.[previous.name];
  }
  updatePlugin(info, buildChanged);
});

window.addEventListener("beforeunload", () => {
  deactivateAll();
});
