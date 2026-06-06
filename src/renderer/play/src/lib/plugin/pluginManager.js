import { ipcRenderer } from "electron";
import { getAppData } from "../appdata";
import { createPluginContext } from "./pluginContext";
import { reportPluginException } from "./pluginReporter";
import { dynamicImportPlugin } from "./pluginImport";
import { PLUGIN_TYPES } from "@classes/utils";

/**
 * @typedef {import("@shared/plugin.types").PluginType} PluginType
 * @typedef {import("@shared/plugin.types").PluginList} PluginList
 * @typedef {import("@shared/plugin.types").PluginRendererInfo} PluginRendererInfo
 * @typedef {import("@shared/plugin.types").PluginSingleUpdate} PluginSingleUpdate
 * @typedef {{ info: PluginRendererInfo, imported: any, importing?: Promise<any> | null }} RendererPluginData
 * @typedef {(payload: { api: any, info: PluginRendererInfo }) => any} PluginHmrCallback
 * @typedef {(api: any, info: PluginRendererInfo) => any} PluginHmrSubscriber
 */

/** @type {Record<PluginType, Record<string, RendererPluginData>>} */
const plugins = Object.fromEntries(PLUGIN_TYPES.map((t) => [t, {}]));

async function requestUpdatePluginList() {
    await ipcRenderer.invoke("plugin:get-list").then(updateAllPlugin);
}

/**
 * @param {PluginList} pluginList
 * @param {string[]} forceImports
 */
function updateAllPlugin(pluginList, forceImports = []) {
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

/**
 * @param {any} pluginApi
 * @param {string | null} exportName
 */
function resolveExportName(pluginApi, exportName = "default") {
    if (!pluginApi) return null;

    if (!exportName || typeof exportName !== "string" || !exportName.trim()) exportName = "default";

    if (!(exportName in pluginApi)) return null;

    return pluginApi[exportName];
}

/** @param {RendererPluginData} pluginData */
function importPlugin(pluginData) {
    pluginData.importing = dynamicImportPlugin(pluginData.info.distFile)
        .then((p) => {
            if (plugins[pluginData.info.type][pluginData.info.name] !== pluginData)
                return { _expired: true };

            pluginData.importing = null;
            pluginData.imported = p;
            console.log("PLUGIN LOADED: ", pluginData.info.name);
            if (getAppData()?.config.devMode ?? ipcRenderer.sendSync("config:is-dev")) {
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
                        }
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
                }
            );
            return null;
        });
}
/**
 * @param {PluginRendererInfo} pluginInfo
 * @param {boolean} forceImport
 */
function updatePlugin(pluginInfo, forceImport = false) {
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
/**
 * @param {PluginType} type
 * @param {string} pluginName
 * @param {string | null} exportName
 */
export async function getPlugin(type, pluginName, exportName = "default") {
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
let pluginImporting;
export function afterPluginImported() {
    if (pluginImported) return Promise.resolve();
    if (!pluginImporting)
        pluginImporting = requestUpdatePluginList().then(() => (pluginImported = true));

    return pluginImporting;
}

export function safeCallPlugin(ctx, title, callback, onerror = null, logOptions = {}) {
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

/** @type {Record<PluginType, Record<string, Set<PluginHmrSubscriber>>>} */
const hmrSubscribers = {};

/**
 * @param {PluginType} type
 * @param {string} pluginName
 * @param {string | null} exportName
 * @param {PluginHmrCallback} callback
 */
export function subscribePluginHMR(type, pluginName, exportName = "default", callback) {
    const source = { id: pluginName, type: type };

    if (!hmrSubscribers[type]) hmrSubscribers[type] = {};
    let targetSet = hmrSubscribers[type][pluginName];
    if (!targetSet) {
        targetSet = new Set();
        hmrSubscribers[type][pluginName] = targetSet;
    }
    const fn = async (api, info) => {
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
    console.log(type, pluginName);
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

/**
 * @param {PluginRendererInfo} pluginInfo
 * @param {any} plugin
 */
async function callHmr(pluginInfo, plugin) {
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

ipcRenderer.on("plugin:hmr", async (_, pluginInfo) => {
    /** @type {PluginRendererInfo} */
    const info = pluginInfo;
    if (!getAppData().config.devMode) return;
    console.log("Plugin HMR:", info.name);
    updatePlugin(info, !info.error);
});

ipcRenderer.on("plugin:list", (_, p, changedPlugins) => {
    /** @type {PluginList} */
    const pluginList = p;
    updateAllPlugin(pluginList, changedPlugins);
});

ipcRenderer.on("plugin:update", (_, update) => {
    /** @type {PluginSingleUpdate} */
    const { info, previous, buildChanged } = update;
    if (previous && (info.name !== previous.name || info.type !== previous.type)) {
        if (info.type === previous.type && plugins[info.type][info.name])
            plugins[info.type][info.name] = plugins[previous.type]?.[previous.name];
        delete plugins[previous.type]?.[previous.name];
    }
    updatePlugin(info, buildChanged);
});
