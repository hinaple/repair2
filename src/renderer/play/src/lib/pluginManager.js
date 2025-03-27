import PluginPointer from "@classes/pluginPointer.svelte";
import { genId, importPlugin } from "@classes/utils";
import { ipcRenderer } from "electron";
import { requirePackage } from "./requirePackage";

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
            if (importedModules[nameVersion]) return [name, importedModules[nameVersion]];

            const module = await requirePackage(name, version);
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
    const imported = await importPlugin(type, name);
    pluginObj.imported = imported;
    if (imported)
        pluginObj.modules = imported.dependencies ? await loadModules(imported.dependencies) : null;

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
        if (!validPluginName(name)) res(null);

        const pluginObj = loadedPlugins[type][name];
        if (!pluginObj) res(null);

        if (pluginObj.loading) pluginObj.onLoad.push(res);
        else res(pluginObj);
    });
}

function definePlugin(pluginClass) {
    if (customElements.getName(pluginClass)) return;

    let basename = `plugin-${pluginClass.split(".")[0].toLowerCase()}`;
    if (customElements.get(basename)) basename = `${basename}-${genId(3)}`;
    customElements.define(basename, pluginClass);
}

PluginPointer.prototype.use = async function (pluginObj = null) {
    if (!pluginObj) pluginObj = await getPluginAsync(this.type, this.name);
    if (!pluginObj || !pluginObj.imported) return null;

    if (this.type === "frames" || this.type === "elements") {
        const ce = pluginObj.imported;
        definePlugin(ce);
        const temp = new ce({
            modules: pluginObj.modules,
            attributes: this.payloads
        });
        temp.id = this.name;
        this.attributes.forEach((attr) => {
            temp.setAttribute(attr, this.payloads[attr]);
        });
        return temp;
    }

    if (this.type === "functions" || (this.type === "transitions" && this.imported?.function)) {
        return (argument = null) =>
            pluginObj.imported.function({
                attributes: this.payloads,
                modules: pluginObj.modules,
                ...argument
            });
    }
    if (this.type === "transitions") return pluginObj.imported.keyframes ?? [];

    return pluginObj.imported;
};

PluginPointer.prototype.hmrSubscribe = function (callback) {
    if (!validPluginName(this.name)) return null;

    this.use().then(callback);
    return subscribePluginHMR(this.type, this.name, async (pluginObj) =>
        callback(await this.use(pluginObj))
    );
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
    console.log(`Plugin HMR: ${type} - ${name}`);
    const pluginObj = await loadPlugin(type, name, true);
    if (!hmrSubscribers[type]?.[name]) return;
    hmrSubscribers[type][name].forEach((callback) => callback(pluginObj));
});
