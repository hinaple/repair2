import { createRequire } from "module";
import { join } from "path";
import type { PluginInfo } from "./type";
import {
  serializeRuntimeError,
  type RuntimeHostDiagnostic,
  type RuntimeHostMessage,
  type RuntimeHostRequest
} from "./runtimeMainProtocol";

const require = createRequire(import.meta.url);
const parent = process.parentPort;

if (!parent) throw new Error("Runtime plugin host requires an Electron utility process.");

type PluginMethods = Record<string, any>;
type ImportedPlugin = PluginMethods | (() => PluginMethods);

type RuntimePluginData = {
  info: PluginInfo;
  imported: ImportedPlugin | null;
  importing?: Promise<ImportedPlugin | { _expired: true } | null> | null;
  instance?: RuntimePluginInstance;
};

function send(message: RuntimeHostMessage) {
  parent.postMessage(message);
}

function reportDiagnostic(
  kind: RuntimeHostDiagnostic["kind"],
  plugin: Pick<PluginInfo, "name" | "type">,
  error: unknown,
  methodName?: string
) {
  send({
    type: "diagnostic",
    kind,
    plugin,
    ...(methodName ? { methodName } : {}),
    error: serializeRuntimeError(error)
  });
}

function requirePlugin(pluginDir: string, dir: string): ImportedPlugin {
  const resolved = require.resolve(join(pluginDir, dir));
  delete require.cache[resolved];
  const module = require(resolved);
  return module?.default ?? module;
}

class RuntimePluginInstance {
  readonly activationId: string;
  readonly pluginInfo: PluginInfo;
  readonly methods: PluginMethods;
  readonly disposers: Set<() => any> = new Set();
  active = false;
  disposed = false;

  private disposePromise: Promise<void> | null = null;
  private ctx?: Record<string, any>;

  constructor(pluginInfo: PluginInfo, imported: ImportedPlugin, activationId: string) {
    this.activationId = activationId;
    this.pluginInfo = pluginInfo;
    try {
      this.methods = typeof imported === "function" ? imported() : imported;
    } catch (error) {
      reportDiagnostic("factory", this.pluginInfo, error);
      throw error;
    }
  }

  get mainMethods() {
    return Object.keys(this.methods?.main ?? {});
  }

  async activate(rendererMethods: string[], attributes: Record<string, unknown> = {}) {
    if (this.active || this.disposed) return;

    this.active = true;
    const renderer: Record<string, (...args: unknown[]) => void> = Object.fromEntries(
      rendererMethods.map((methodName) => [
        methodName,
        (...args: unknown[]) =>
          send({
            type: "renderer-call",
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
    } catch (error) {
      this.active = false;
      await this.dispose();
      throw error;
    }
  }

  async callMainMethod(methodName: string, args: unknown[]) {
    if (this.disposed) return null;
    try {
      return await this.methods?.main?.[methodName]?.(...args);
    } catch (error) {
      reportDiagnostic("method", this.pluginInfo, error, methodName);
      throw error;
    }
  }

  onDispose(disposer: () => any) {
    if (typeof disposer !== "function") return () => {};
    if (this.disposed) {
      void this.safeDispose(disposer);
      return () => {};
    }

    this.disposers.add(disposer);
    return () => this.disposers.delete(disposer);
  }

  private async safeDispose(disposer: () => any) {
    try {
      await disposer();
    } catch (error) {
      reportDiagnostic("disposer", this.pluginInfo, error);
    }
  }

  dispose() {
    if (this.disposePromise) return this.disposePromise;

    this.disposed = true;
    const disposers = [...this.disposers];
    this.disposers.clear();
    this.disposePromise = Promise.all(disposers.map((disposer) => this.safeDispose(disposer))).then(
      () => undefined
    );
    return this.disposePromise;
  }
}

class RuntimePluginHost {
  private plugins: Map<string, RuntimePluginData> = new Map();

  updatePlugin(pluginDir: string, pluginInfo: PluginInfo, forceImport = false) {
    if (pluginInfo.type !== "runtime" || !pluginInfo.main) return null;
    if (!forceImport && this.plugins.has(pluginInfo.name)) return this.getPlugin(pluginInfo.name);

    const previous = this.plugins.get(pluginInfo.name);
    const tempData: RuntimePluginData = {
      info: pluginInfo,
      imported: null,
      instance: previous?.instance
    };
    tempData.importing = Promise.resolve()
      .then(() => requirePlugin(pluginDir, pluginInfo.mainDistFile as string))
      .then((plugin) => {
        if (this.plugins.get(pluginInfo.name) !== tempData) return { _expired: true } as const;
        tempData.importing = null;
        tempData.imported = plugin;
        return plugin;
      })
      .catch((error) => {
        if (this.plugins.get(pluginInfo.name) === tempData) {
          tempData.importing = null;
          tempData.imported = null;
        }
        reportDiagnostic("load", pluginInfo, error);
        return null;
      });
    this.plugins.set(pluginInfo.name, tempData);
    return this.getPlugin(pluginInfo.name);
  }

  private async getPlugin(pluginName: string) {
    while (true) {
      const target = this.plugins.get(pluginName);
      if (!target) return null;
      if (target.imported) return target.imported;
      const result = await target.importing;
      if (!result) return null;
      if (!("_expired" in result)) return result;
    }
  }

  private getPluginInstance(pluginName: string) {
    return this.plugins.get(pluginName)?.instance ?? null;
  }

  private getActiveInstance(pluginName: string, activationId: string) {
    const instance = this.getPluginInstance(pluginName);
    if (!instance || instance.activationId !== activationId || instance.disposed) return null;
    return instance;
  }

  async createInstance(pluginName: string, activationId: string) {
    const plugin = await this.getPlugin(pluginName);
    const target = this.plugins.get(pluginName);
    if (!target || !plugin) return null;

    const previous = target.instance;
    if (previous) {
      await previous.dispose();
      if (target.instance === previous) delete target.instance;
    }
    const instance = new RuntimePluginInstance(target.info, plugin, activationId);
    target.instance = instance;
    return { mainMethods: instance.mainMethods };
  }

  async activateInstance(
    pluginName: string,
    activationId: string,
    rendererMethods: string[],
    attributes: Record<string, unknown>
  ) {
    const instance = this.getActiveInstance(pluginName, activationId);
    if (!instance) return false;
    await instance.activate(rendererMethods, attributes);
    return true;
  }

  callMainMethod(pluginName: string, activationId: string, methodName: string, args: unknown[]) {
    return (
      this.getActiveInstance(pluginName, activationId)?.callMainMethod(methodName, args) ?? null
    );
  }

  async disposeInstance(pluginName: string, activationId?: string) {
    const target = this.plugins.get(pluginName);
    const instance = target?.instance;
    if (!target || !instance) return false;
    if (activationId && instance.activationId !== activationId) return false;

    try {
      await instance.dispose();
    } catch (error) {
      reportDiagnostic("dispose", target.info, error);
    } finally {
      if (target.instance === instance) delete target.instance;
    }
    return true;
  }

  async removePlugin(pluginName: string) {
    const target = this.plugins.get(pluginName);
    if (!target) return false;
    this.plugins.delete(pluginName);
    try {
      await target.instance?.dispose();
    } catch (error) {
      reportDiagnostic("dispose", target.info, error);
    }
    return true;
  }

  async removeAllPluginExcept(pluginNames: string[]) {
    const exceptNames = new Set(pluginNames);
    await Promise.all(
      [...this.plugins.keys()]
        .filter((pluginName) => !exceptNames.has(pluginName))
        .map((pluginName) => this.removePlugin(pluginName))
    );
  }

  async disposeAll() {
    await Promise.all(
      [...this.plugins.keys()].map((pluginName) => this.disposeInstance(pluginName))
    );
  }

  async shutdown() {
    await this.disposeAll();
    this.plugins.clear();
  }
}

const host = new RuntimePluginHost();

async function handleRequest(request: RuntimeHostRequest): Promise<unknown> {
  switch (request.type) {
    case "update-plugin":
      return !!(await host.updatePlugin(
        request.payload.pluginDir,
        request.payload.pluginInfo,
        request.payload.forceImport
      ));
    case "create-instance":
      return host.createInstance(request.payload.pluginName, request.payload.activationId);
    case "activate-instance":
      return host.activateInstance(
        request.payload.pluginName,
        request.payload.activationId,
        request.payload.rendererMethods,
        request.payload.attributes
      );
    case "call-main":
      return host.callMainMethod(
        request.payload.pluginName,
        request.payload.activationId,
        request.payload.methodName,
        request.payload.args
      );
    case "dispose-instance":
      return host.disposeInstance(request.payload.pluginName, request.payload.activationId);
    case "remove-plugin":
      return host.removePlugin(request.payload.pluginName);
    case "remove-all-except":
      return host.removeAllPluginExcept(request.payload.pluginNames);
    case "dispose-all":
      return host.disposeAll();
    case "shutdown":
      return host.shutdown();
  }
}

parent.on("message", ({ data }: { data: RuntimeHostRequest }) => {
  void handleRequest(data).then(
    (result) => send({ type: "response", replyTo: data.id, ok: true, result }),
    (error) =>
      send({
        type: "response",
        replyTo: data.id,
        ok: false,
        error: serializeRuntimeError(error)
      })
  );
});
