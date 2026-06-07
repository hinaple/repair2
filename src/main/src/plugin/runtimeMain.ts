import { join } from "path";
import { PluginInfo } from "./type";
import { createRequire } from "module";
import { logger } from "../logs/logger";
import type { PluginDiagnostics } from "./pluginDiagnostics";

const require = createRequire(import.meta.url);

let sendToRendererCB: ((channel: string, ...args: any[]) => void) | null;
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
    activationId: string;
    pluginInfo: PluginInfo;
    methods: PluginMethods;
    ctx?: Record<string, any>;
    private pluginDiagnostics: PluginDiagnostics;
    disposers: Set<() => any> = new Set();
    active: boolean = false;
    disposed: boolean = false;
    constructor(
        pluginInfo: PluginInfo,
        imported: ImportedPlugin,
        activationId: string,
        pluginDiagnostics: PluginDiagnostics
    ) {
        this.activationId = activationId;
        this.pluginInfo = pluginInfo;
        this.pluginDiagnostics = pluginDiagnostics;
        try {
            this.methods = typeof imported === "function" ? imported() : imported;
        } catch (err) {
            this.pluginDiagnostics.runtimeMainFactoryFailed(this.pluginInfo, [err]);
            throw err;
        }
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
                        activationId: this.activationId,
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
        try {
            const activeResult = await this.methods?.activate?.({
                ctx: this.ctx,
                attributes,
                renderer
            });
            if (typeof activeResult === "function") this.onDispose(activeResult);
        } catch (err) {
            this.active = false;
            this.dispose();
            throw err;
        }
    }
    callMainMethod(methodName: string, args: any[]) {
        if (this.disposed) return null;
        try {
            return this.methods?.main?.[methodName]?.(...args);
        } catch (err) {
            this.pluginDiagnostics.runtimeMainMethodFailed(this.pluginInfo, methodName, [err]);
            throw err;
        }
    }
    onDispose(disposer: () => any) {
        if (typeof disposer !== "function") return () => {};
        if (this.disposed) {
            this.safeDispose(disposer);
            return () => {};
        }

        this.disposers.add(disposer);
        return () => this.disposers.delete(disposer);
    }
    private reportDisposeError(err: any) {
        this.pluginDiagnostics.runtimeMainDisposerFailed(this.pluginInfo, err);
    }
    private safeDispose(disposer: () => any) {
        try {
            const result = disposer?.();
            if (result && typeof result.catch === "function") {
                result.catch((err: any) => this.reportDisposeError(err));
            }
        } catch (err) {
            this.reportDisposeError(err);
        }
    }
    dispose() {
        if (this.disposed) return;

        this.disposed = true;
        const disposers = [...this.disposers];
        this.disposers.clear();
        disposers.forEach((d) => this.safeDispose(d));
    }
}

export default class MainRuntimePluginEngine {
    private pluginDir: string;
    private plugins: Map<string, RuntimePluginData> = new Map();
    private pluginDiagnostics: PluginDiagnostics;

    constructor({
        pluginDir,
        pluginDiagnostics
    }: {
        pluginDir: string;
        pluginDiagnostics: PluginDiagnostics;
    }) {
        this.pluginDir = pluginDir;
        this.pluginDiagnostics = pluginDiagnostics;
    }
    updatePlugin(pluginInfo: PluginInfo, forceImport = false) {
        if (pluginInfo.type !== "runtime" || !pluginInfo.main) return null;

        if (!forceImport && this.plugins.has(pluginInfo.name))
            return this.getPlugin(pluginInfo.name);

        const previous = this.plugins.get(pluginInfo.name);

        const tempData: RuntimePluginData = {
            info: pluginInfo,
            imported: null,
            instance: previous?.instance
        };
        logger.info(
            `LOADING PLUGIN: ${pluginInfo.name}(${join(this.pluginDir, pluginInfo.mainDistFile as string)})`
        );
        tempData.importing = Promise.resolve()
            .then(() => requirePlugin(this.pluginDir, pluginInfo.mainDistFile as string))
            .then((p) => {
                if (this.plugins.get(pluginInfo.name) !== tempData) return { _expired: true };

                tempData.importing = null;
                tempData.imported = p;
                logger.info("PLUGIN LOADED: " + pluginInfo.name);
                return p;
            })
            .catch((err) => {
                if (this.plugins.get(pluginInfo.name) === tempData) {
                    tempData.importing = null;
                    tempData.imported = null;
                }

                this.pluginDiagnostics.runtimeMainLoadFailed(pluginInfo, err);
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
        if (!target || !target?.instance) return null;
        return target.instance;
    }
    getActiveInstance(pluginName: string, activationId: string) {
        const instance = this.getPluginInstance(pluginName);
        if (!instance || instance.activationId !== activationId || instance.disposed) return null;
        return instance;
    }
    async createInstance(pluginName: string, activationId: string) {
        let plugin = await this.getPlugin(pluginName);
        const target = this.plugins.get(pluginName);
        if (!target) return null;
        if (!plugin) {
            this.disposeInstance(pluginName);
            return null;
        }
        const previous = target.instance;
        if (previous) {
            previous.dispose();
            if (target.instance === previous) delete target.instance;
        }
        const instance = new RuntimePluginInstance(
            target.info,
            plugin,
            activationId,
            this.pluginDiagnostics
        );
        target.instance = instance;
        return target.instance;
    }
    removePlugin(pluginName: string) {
        const target = this.plugins.get(pluginName);
        if (!target) return;
        target.instance?.dispose();
        this.plugins.delete(pluginName);
    }
    removeAllPluginExcept(exceptNames: string[]) {
        this.plugins.keys().forEach((name) => {
            if (exceptNames.includes(name)) return;
            this.removePlugin(name);
        });
    }
    disposeInstance(pluginName: string, activationId?: string) {
        const target = this.plugins.get(pluginName);
        const instance = target?.instance;
        if (!target || !instance) return false;
        if (activationId && instance.activationId !== activationId) return false;

        try {
            instance.dispose();
        } catch (err) {
            this.pluginDiagnostics.runtimeMainDisposeFailed(target.info, [err]);
        } finally {
            if (target.instance === instance) delete target.instance;
        }
        return true;
    }
    disposeAll() {
        this.plugins.forEach((p, pluginName) => {
            try {
                if (p.instance) p.instance.dispose();
            } catch (err) {
                this.pluginDiagnostics.runtimeMainDisposeFailed(p.info, [err]);
            } finally {
                delete p.instance;
            }
        });
    }
}
