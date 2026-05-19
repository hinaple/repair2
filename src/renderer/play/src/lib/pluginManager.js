import PluginPointer from "@classes/pluginPointer.svelte";
import { genId, importPlugin } from "@classes/utils";
import { ipcRenderer } from "electron";
import { requirePackage } from "./requirePackage";
import { getAppData } from "./appdata";
import { createPluginContext } from "./pluginContext";
import { reportPluginException } from "./pluginReporter";

const loadedPlugins = {};
const importedModules = {};

async function loadModules(dependencies) {
    if (!dependencies) return {};

    if (Array.isArray(dependencies)) {
        const obj = {};
        dependencies.forEach((name) => (obj[name] = "latest"));
        dependencies = obj;
    }

    const modules = {};
    await Promise.all(
        Object.entries(dependencies).map(async ([name, version]) => {
            const nameVersion = `${name}@${version}`;
            if (importedModules[nameVersion]) {
                modules[name] = importedModules[nameVersion];
                return;
            }

            let module;
            try {
                module = await requirePackage(name, version);
            } catch (err) {
                throw new Error(`Failed to load dependency ${name}@${version}`, { cause: err });
            }
            importedModules[nameVersion] = module;
            modules[name] = module;
        })
    );
    return modules;
}

function validPluginName(name) {
    return name && name !== "null";
}

async function loadPlugin(type, name, forceLoad = false) {
    if (!validPluginName(name)) return null;

    if (!loadedPlugins[type]) loadedPlugins[type] = {};
    if (loadedPlugins[type][name]?.imported && !forceLoad) return loadedPlugins[type][name];

    const pluginObj = {
        imported: null,
        onLoad: [...(loadedPlugins[type][name]?.onLoad ?? [])], // in case onloads existed
        loading: true
    };
    loadedPlugins[type][name] = pluginObj;
    console.log(`Plugin loading: ${type} - ${name}`);
    try {
        const imported = await importPlugin(type, name);
        pluginObj.imported = imported;
        // if (imported)
        //     pluginObj.modules = imported.dependencies
        //         ? await loadModules(imported.dependencies)
        //         : null;
    } catch (err) {
        reportPluginException({ id: name, type }, "Plugin load failed.", err);
        pluginObj.imported = null;
        // pluginObj.modules = null;
    }

    pluginObj.loading = false;
    pluginObj.onLoad.forEach((onLoad) => onLoad(pluginObj));
    pluginObj.onLoad = null;

    return pluginObj;
}

PluginPointer.prototype.import = function () {
    return loadPlugin(this.type, this.name);
};

function getPluginAsync(type, name) {
    return new Promise((res) => {
        if (!validPluginName(name)) return res(null);

        const pluginObj = loadedPlugins[type]?.[name];
        if (!pluginObj) return res(null);

        if (pluginObj.loading) pluginObj.onLoad.push(res);
        else res(pluginObj);
    });
}

function definePlugin(pluginClass, name) {
    if (customElements.getName(pluginClass)) return;

    let basename = `plugin-${name.split(".")[0].toLowerCase()}`;
    if (customElements.get(basename)) basename = `${basename}-${genId(3)}`;
    customElements.define(basename, pluginClass);
}

function safeCallPlugin(ctx, title, callback, fallback = null) {
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

PluginPointer.prototype.use = async function (
    pluginObj = null,
    contextOptions = {},
    forceCtx = undefined,
    functionName = "function",
    payloads = this.payloads
) {
    if (!pluginObj) pluginObj = await getPluginAsync(this.type, this.name);
    if (!pluginObj || !pluginObj.imported) return null;

    if (this.type === "frame" || this.type === "element") {
        const ce = pluginObj.imported;
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

    if (
        this.type === "function" ||
        this.type === "runtime" ||
        (this.type === "transition" && pluginObj.imported?.[functionName])
    ) {
        const ctx =
            forceCtx ??
            createPluginContext({
                pluginId: this.name,
                pluginType: this.type,
                ...contextOptions
            });
        return (argument = null) =>
            safeCallPlugin(ctx, "Plugin function execution failed.", () =>
                pluginObj.imported[functionName]({
                    attributes: payloads,
                    // modules: pluginObj.modules,
                    ctx,
                    ...argument
                })
            );
    }
    if (this.type === "transition") return pluginObj.imported.keyframes ?? [];

    return pluginObj.imported;
};

PluginPointer.prototype.hmrSubscribe = function (callback, contextOptions = {}) {
    if (!validPluginName(this.name)) return null;

    const source = { id: this.name, type: this.type };
    this.use(null, contextOptions)
        .then(callback)
        .catch((err) => reportPluginException(source, "Plugin HMR initial callback failed.", err));
    return subscribePluginHMR(this.type, this.name, async (pluginObj) => {
        try {
            callback(await this.use(pluginObj, contextOptions));
        } catch (err) {
            reportPluginException(source, "Plugin HMR callback failed.", err);
        }
    });
};

const hmrSubscribers = {};
export default function subscribePluginHMR(type, pluginName, callback) {
    if (!hmrSubscribers[type]) hmrSubscribers[type] = {};
    if (!hmrSubscribers[type][pluginName]) hmrSubscribers[type][pluginName] = new Map();
    const key = Symbol();
    hmrSubscribers[type][pluginName].set(key, callback);
    return () => {
        hmrSubscribers[type][pluginName].delete(key);
    };
}

ipcRenderer.on("plugin-hmr", async (_, { type, name }) => {
    if (!getAppData().config.devMode) return;
    console.log(`Plugin HMR: ${type} - ${name}`);
    const pluginObj = await loadPlugin(type, name, true);
    if (!hmrSubscribers[type]?.[name]) return;
    hmrSubscribers[type][name].forEach((callback) => {
        try {
            callback(pluginObj);
        } catch (err) {
            reportPluginException({ id: name, type }, "Plugin HMR subscriber failed.", err);
        }
    });
});
