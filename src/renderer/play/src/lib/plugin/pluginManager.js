import PluginPointer from "@classes/pluginPointer.svelte";
import { genId } from "@classes/utils";
import { ipcRenderer } from "electron";
import { getAppData } from "../appdata";
import { createPluginContext } from "./pluginContext";
import { reportPluginException } from "./pluginReporter";
import { importPlugin } from "./pluginImport";

const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"];
const plugins = Object.fromEntries(PLUGIN_TYPES.map((t) => [t, {}]));

async function requestUpdatePluginList() {
    await ipcRenderer.invoke("plugin:get-list").then(updateAllPlugin);
}
function updateAllPlugin(pluginList) {
    PLUGIN_TYPES.map((t) => {
        plugins[t] = {};
    });
    return Promise.all(Object.values(pluginList).map(updatePlugin));
}

function updatePlugin(pluginInfo, forceImport = false) {
    if (!forceImport && plugins[pluginInfo.type][pluginInfo.name])
        return getPlugin(pluginInfo.type, pluginInfo.name);

    const tempData = { info: pluginInfo, imported: null };
    console.log("LOADING PLUGIN: ", pluginInfo.name);
    tempData.importing = importPlugin(pluginInfo.distFile)
        .then((p) => {
            if (plugins[pluginInfo.type][pluginInfo.name] !== tempData) return { _expired: true };

            tempData.importing = null;
            tempData.imported = p;
            console.log("PLUGIN LOADED: ", pluginInfo.name);
            return p;
        })
        .catch((err) => {
            if (plugins[pluginInfo.type][pluginInfo.name] === tempData) {
                tempData.importing = null;
                tempData.imported = null;
            }

            reportPluginException(
                { id: pluginInfo.name, type: pluginInfo.type },
                "Plugin importing failed.",
                err
            );
            return null;
        });
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

function definePlugin(pluginClass, name) {
    if (customElements.getName(pluginClass)) return;

    let basename = `plugin-${name.split(".")[0].toLowerCase()}`;
    if (customElements.get(basename)) basename = `${basename}-${genId(3)}`;
    customElements.define(basename, pluginClass);
}

export function safeCallPlugin(ctx, title, callback, fallback = null) {
    try {
        const result = callback();
        if (result?.then)
            return result.catch((err) => {
                reportPluginException(ctx.plugin, title, err);
                return fallback;
            });
        return result;
    } catch (err) {
        reportPluginException(ctx.plugin, title, err);
        return fallback;
    }
}

PluginPointer.prototype.getInfo = function () {
    return plugins[this.type][this.name]?.info;
};

PluginPointer.prototype.use = async function (
    plugin = null,
    contextOptions = {},
    forceCtx = undefined,
    functionName = "function",
    payloads = this.payloads
) {
    if (!plugin) plugin = await getPlugin(this.type, this.name);
    if (!plugin) return null;

    if (this.type === "runtime") return plugin;

    if (this.type === "frame" || this.type === "element") {
        const ce = plugin;
        const ctx =
            forceCtx ??
            createPluginContext({
                pluginId: this.name,
                pluginType: this.type,
                ...contextOptions
            });
        const temp = safeCallPlugin(ctx, "Plugin element creation failed.", () => {
            definePlugin(ce, this.name);
            return new ce({
                // modules: pluginObj.modules,
                attributes: payloads,
                ctx
            });
        });
        if (!temp) {
            ctx.lifecycle.dispose();
            return null;
        }
        temp.__repairPluginContext = ctx;
        temp.id = this.name;
        this.attributes.forEach((attr) => {
            temp.setAttribute(attr, payloads[attr]);
        });
        return temp;
    }

    if (typeof plugin === "function") plugin = await plugin(); //plugin can be a factory
    if (this.type === "function" || (this.type === "transition" && plugin?.[functionName])) {
        const ctx =
            forceCtx ??
            createPluginContext({
                pluginId: this.name,
                pluginType: this.type,
                ...contextOptions
            });
        return (argument = null) =>
            safeCallPlugin(ctx, "Plugin function execution failed.", () =>
                plugin?.[functionName]({
                    attributes: payloads,
                    // modules: pluginObj.modules,
                    ctx,
                    ...argument
                })
            );
    }
    if (this.type === "transition") return plugin?.keyframes ?? [];

    return plugin;
};

PluginPointer.prototype.hmrSubscribe = function (callback, contextOptions = {}) {
    if (!this.name) return null;

    const source = { id: this.name, type: this.type };
    this.use(null, contextOptions)
        .then(callback)
        .catch((err) => reportPluginException(source, "Plugin HMR initial callback failed.", err));
    return subscribePluginHMR(this.type, this.name, async (plugin) => {
        try {
            callback(await this.use(plugin, contextOptions));
        } catch (err) {
            reportPluginException(source, "Plugin HMR callback failed.", err);
        }
    });
};

/** @type {Record<string, Record<string, Set<(any) => any>>>} */
const hmrSubscribers = {};
export default function subscribePluginHMR(type, pluginName, callback) {
    if (!hmrSubscribers[type]) hmrSubscribers[type] = {};
    let targetSet = hmrSubscribers[type][pluginName];
    if (!targetSet) {
        targetSet = new Set();
        hmrSubscribers[type][pluginName] = targetSet;
    }
    targetSet.add(callback);
    return () => {
        targetSet.delete(callback);
    };
}

ipcRenderer.on("plugin-hmr", async (_, pluginInfo) => {
    if (!getAppData().config.devMode) return;
    console.log("Plugin HMR:", pluginInfo.name);
    const plugin = await updatePlugin(pluginInfo);
    if (plugin?._expired) return;
    const targetSet = hmrSubscribers[pluginInfo.type]?.[pluginInfo.name];
    if (!targetSet) return;
    targetSet.forEach((callback) => {
        try {
            callback(plugin);
        } catch (err) {
            reportPluginException(
                { id: pluginInfo.name, type: pluginInfo.type },
                "Plugin HMR subscriber failed.",
                err
            );
        }
    });
});

ipcRenderer.on("plugin-list", (_, p) => {
    updateAllPlugin(p);
});
