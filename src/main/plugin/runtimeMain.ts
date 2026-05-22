import { join } from "path";
import { PluginInfo } from "./type";
import { createRequire } from "module";
import type { ReportDiagnostic } from "../diagnostics";

const require = createRequire(import.meta.url);

let sendToRendererCB: ((channel: string, ...args: any[]) => undefined) | null;
export function setSendToWin(stm: typeof sendToRendererCB) {
    sendToRendererCB = stm;
}

function sendToRenderer(channel: string, ...args: any[]) {
    if (!sendToRendererCB) {
        console.error("CANNOT SEND TO RENDERER");
        return;
    }
    return sendToRendererCB(channel, ...args);
}

type PluginMethods = Record<string, any>;
type ImportedPlugin = PluginMethods | (() => PluginMethods);
export function requirePlugin(pluginDir: string, dir: string): ImportedPlugin {
    const resolved = require.resolve(join(pluginDir, dir));

    delete require.cache[resolved];

    const module = require(resolved);
    return module?.default ?? module;
}

type RuntimePluginData = {
    info: PluginInfo;
    imported: ImportedPlugin | null;
    importing?: Promise<ImportedPlugin | { _expired: true } | null> | null;
    instance?: RuntimePluginInstance;
};

class RuntimePluginInstance {
    pluginInfo: PluginInfo;
    methods: PluginMethods;
    ctx?: Record<string, any>;
    disposers: Set<() => any> = new Set();
    active: boolean = false;
    disposed: boolean = false;
    constructor(pluginInfo: PluginInfo, imported: ImportedPlugin) {
        this.pluginInfo = pluginInfo;
        this.methods = typeof imported === "function" ? imported() : imported;
    }
    get mainMethods() {
        return Object.keys(this.methods?.main ?? {});
    }
    async activate(rendererMethods: string[], attributes: Record<string, any> = {}) {
        if (this.active) return;

        this.active = true;
        const renderer: Record<string, (...args: any[]) => void> = Object.fromEntries(
            rendererMethods.map((methodName) => [
                methodName,
                (...args) =>
                    sendToRenderer("plugin:runtime:to-renderer", {
                        pluginName: this.pluginInfo.name,
                        methodName,
                        args
                    })
            ])
        );
        const getDisposed = () => this.disposed;
        this.ctx = {
            lifecycle: {
                onDispose: (disposer: () => any) => this.onDispose(disposer),
                dispose: () => this.dispose(),
                get disposed() {
                    return getDisposed();
                }
            }
        };
        const activeResult = await this.methods?.activate?.({
            ctx: this.ctx,
            attributes,
            renderer
        });
        if (typeof activeResult === "function") this.disposers.add(activeResult);
    }
    callMainMethod(methodName: string, args: any[]) {
        return this.methods?.main?.[methodName]?.(...args);
    }
    onDispose(disposer: () => any) {
        if (typeof disposer !== "function") return () => {};
        if (this.disposed) {
            disposer();
            return () => {};
        }

        this.disposers.add(disposer);
        return () => this.disposers.delete(disposer);
    }
    dispose() {
        if (this.disposed) return;

        this.disposed = true;
        this.disposers.forEach((d) => d?.());
        this.disposers.clear();
    }
}

export default class MainRuntimePluginEngine {
    private pluginDir: string;
    private plugins: Map<string, RuntimePluginData> = new Map();
    private reportDiagnostic?: ReportDiagnostic;

    constructor({
        pluginDir,
        reportDiagnostic = null
    }: {
        pluginDir: string;
        reportDiagnostic?: ReportDiagnostic | null;
    }) {
        this.pluginDir = pluginDir;
        this.reportDiagnostic = reportDiagnostic ?? undefined;
    }
    updatePlugin(pluginInfo: PluginInfo, forceImport = false) {
        if (pluginInfo.type !== "runtime" || !pluginInfo.main) return null;

        if (!forceImport && this.plugins.has(pluginInfo.name))
            return this.getPlugin(pluginInfo.name);

        const tempData: RuntimePluginData = { info: pluginInfo, imported: null };
        console.log(
            `LOADING PLUGIN: ${pluginInfo.name}(${join(this.pluginDir, pluginInfo.mainDistFile as string)})`
        );
        tempData.importing = Promise.resolve()
            .then(() => requirePlugin(this.pluginDir, pluginInfo.mainDistFile as string))
            .then((p) => {
                if (this.plugins.get(pluginInfo.name) !== tempData) return { _expired: true };

                tempData.importing = null;
                tempData.imported = p;
                console.log("PLUGIN LOADED: ", pluginInfo.name);
                return p;
            })
            .catch((err) => {
                if (this.plugins.get(pluginInfo.name) === tempData) {
                    tempData.importing = null;
                    tempData.imported = null;
                }

                this.reportDiagnostic?.({
                    level: "error",
                    title: "Runtime main plugin load failed.",
                    detail: `Plugin: ${pluginInfo.name}`,
                    error: err,
                    source: "plugin",
                    subject: { id: pluginInfo.name, type: pluginInfo.type },
                    dialogue: false,
                    logType: "plugin-runtime-main-load-error"
                });
                return null;
            });
        this.plugins.set(pluginInfo.name, tempData);
        return this.getPlugin(pluginInfo.name);
    }
    async getPlugin(pluginName: string) {
        while (true) {
            const target = this.plugins.get(pluginName);
            if (!target) return null;
            if (target.imported) return target.imported;
            const result = await target.importing;
            if (!result) return null;
            if (!("_expired" in result)) return result;
        }
    }
    getPluginInstance(pluginName: string) {
        const target = this.plugins.get(pluginName);
        console.log(target);
        if (!target || !target?.instance) return null;
        return target.instance;
    }
    async createInstance(pluginName: string) {
        let plugin = await this.getPlugin(pluginName);
        if (!plugin) return null;
        const target = this.plugins.get(pluginName) as RuntimePluginData;
        if (target.instance) target.instance.dispose();
        target.instance = new RuntimePluginInstance(target.info, plugin);
        return target.instance;
    }
    disposeAll() {
        this.plugins.forEach((p) => {
            if (p.instance) p.instance.dispose();
        });
    }
}
