import PluginPointer from "@classes/pluginPointer.svelte";
import { genId } from "@classes/utils";
import { ipcRenderer } from "electron";
import { getAppData } from "../appdata";
import { createPluginContext } from "./pluginContext";
import { reportPluginException } from "./pluginReporter";
import { dynamicImportPlugin } from "./pluginImport";
import { PLUGIN_TYPES } from "@classes/utils";

/** @type {Record<string, Record<string, { info: PluginInfo, imported: any, importing: Promise<any> | null }>>} */
const plugins = Object.fromEntries(PLUGIN_TYPES.map((t) => [t, {}]));

async function requestUpdatePluginList() {
    await ipcRenderer.invoke("plugin:get-list").then(updateAllPlugin);
}
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

function importPlugin(pluginData) {
    pluginData.importing = dynamicImportPlugin(pluginData.info.distFile)
        .then((p) => {
            if (plugins[pluginData.info.type][pluginData.info.name] !== pluginData)
                return { _expired: true };

            pluginData.importing = null;
            pluginData.imported = p;
            console.log("PLUGIN LOADED: ", pluginData.info.name);
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
                err
            );
            return null;
        });
}
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
async function getPlugin(type, pluginName) {
    while (true) {
        const target = plugins[type][pluginName];
        if (!target) return null;
        if (target.imported) return target.imported;
        const result = await target.importing;
        if (!result?._expired) return result;
    }
}

let pluginImporting = requestUpdatePluginList().then(() => (pluginImporting = null));
export function afterPluginImported() {
    return pluginImporting;
}

export function safeCallPlugin(ctx, title, callback, onerror = null) {
    try {
        const result = callback();
        if (result?.then)
            return result.catch((err) => {
                reportPluginException(ctx.plugin, title, err);
                return onerror?.(err);
            });
        return result;
    } catch (err) {
        reportPluginException(ctx.plugin, title, err);
        return onerror?.(err);
    }
}

PluginPointer.prototype.getInfo = function () {
    return plugins[this.type][this.name]?.info;
};

export async function usePlugin({
    type,
    name,
    plugin = null,
    contextOptions = {},
    forceCtx = undefined,
    functionName = "function",
    payloads = {}
}) {
    if (!plugin) plugin = await getPlugin(type, name);
    if (!plugin) return null;

    if (type === "runtime") return plugin;

    if (type === "frame" || type === "element") {
        const mount = plugin;
        const ctx =
            forceCtx ??
            createPluginContext({
                pluginId: name,
                pluginType: type,
                ...contextOptions
            });
        if (typeof mount !== "function") {
            ctx.lifecycle.dispose();
            return null;
        }
        return (args) =>
            safeCallPlugin(ctx, "Plugin element creation failed.", () => {
                return mount({ ctx, attributes: payloads }, args);
            });
    }

    if (typeof plugin === "function") plugin = await plugin(); //plugin can be a factory
    if (type === "function" || (type === "transition" && plugin?.[functionName])) {
        const ctx =
            forceCtx ??
            createPluginContext({
                pluginId: name,
                pluginType: type,
                ...contextOptions
            });
        return (argument = null) =>
            safeCallPlugin(ctx, "Plugin function execution failed.", () =>
                plugin?.[functionName]({
                    attributes: payloads,
                    ctx,
                    ...argument
                })
            );
    }
    if (type === "transition") return plugin?.keyframes ?? [];

    return plugin;
}

PluginPointer.prototype.use = async function (
    plugin = null,
    contextOptions = {},
    forceCtx = undefined,
    functionName = "function",
    payloads = this.payloads
) {
    if (!this.name) return null;

    return usePlugin({
        plugin,
        type: this.type,
        name: this.name,
        contextOptions,
        forceCtx,
        functionName,
        payloads
    });
};

PluginPointer.prototype.hmrSubscribe = function (callback) {
    if (!this.name) return null;

    return subscribePluginHMR(this.type, this.name, callback);
};

/** @type {Record<string, Record<string, Set<(any) => any>>>} */
const hmrSubscribers = {};
export function subscribePluginHMR(type, pluginName, callback) {
    const source = { id: pluginName, type: type };

    if (!hmrSubscribers[type]) hmrSubscribers[type] = {};
    let targetSet = hmrSubscribers[type][pluginName];
    if (!targetSet) {
        targetSet = new Set();
        hmrSubscribers[type][pluginName] = targetSet;
    }
    const fn = async (api, info) => {
        try {
            callback({ api, info });
        } catch (err) {
            reportPluginException(source, "Plugin HMR callback failed.", err);
        }
    };

    let unsubscribed = false;
    getPlugin(type, pluginName)
        .then((pluginApi) => {
            if (!unsubscribed) callback({ api: pluginApi, info: plugins[type][pluginName].info });
        })
        .catch((err) => reportPluginException(source, "Plugin HMR initial callback failed.", err))
        .finally(() => {
            if (!unsubscribed) targetSet.add(fn);
        });

    return () => {
        unsubscribed = true;
        targetSet.delete(fn);
    };
}

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
                    err
                );
            });
    });
}

ipcRenderer.on("plugin-hmr", async (_, pluginInfo) => {
    if (!getAppData().config.devMode) return;
    console.log("Plugin HMR:", pluginInfo.name);
    updatePlugin({ ...pluginInfo, ready: true }, true);
});

ipcRenderer.on("plugin:list", (_, p, changedPlugins) => {
    updateAllPlugin(p, changedPlugins);
});

ipcRenderer.on("plugin:update", (_, { info, previous, buildChanged }) => {
    if (previous) delete plugins[previous.type]?.[previous.name];
    updatePlugin(info, buildChanged);
});
