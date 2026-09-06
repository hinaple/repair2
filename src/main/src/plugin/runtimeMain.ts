import { utilityProcess, type UtilityProcess } from "electron";
import { join } from "path";
import { logger } from "../logs/logger";
import type { PluginDiagnostics } from "./pluginDiagnostics";
import type { PluginInfo } from "./type";
import runtimeMainHostPath from "./runtimeMainHost?modulePath";
import {
  deserializeRuntimeError,
  type RuntimeHostDiagnostic,
  type RuntimeHostMessage,
  type RuntimeHostRequest
} from "./runtimeMainProtocol";
import type { MainAppMessage } from "../app/mainAppMessage";

const DISPOSE_TIMEOUT_MS = 2_000;
const EXIT_TIMEOUT_MS = 5_000;

type RuntimeHostRequestType = RuntimeHostRequest["type"];
type RuntimeHostRequestPayload<TType extends RuntimeHostRequestType> = Extract<
  RuntimeHostRequest,
  { type: TType }
>["payload"];

type RuntimePluginData = {
  info: PluginInfo;
  ready: boolean;
  importing?: Promise<boolean> | null;
  instance?: RuntimePluginInstanceProxy;
};

type PendingRequest = {
  child: UtilityProcess;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

class RuntimePluginInstanceProxy {
  readonly pluginInfo: PluginInfo;
  readonly activationId: string;
  mainMethods: string[];
  active = false;
  disposed = false;

  private engine: MainRuntimePluginEngine;

  constructor(
    engine: MainRuntimePluginEngine,
    pluginInfo: PluginInfo,
    activationId: string,
    mainMethods: string[]
  ) {
    this.engine = engine;
    this.pluginInfo = pluginInfo;
    this.activationId = activationId;
    this.mainMethods = mainMethods;
  }

  async activate(rendererMethods: string[], attributes: Record<string, unknown> = {}) {
    if (this.active || this.disposed) return;
    const activated = await this.engine.request<"activate-instance", boolean>("activate-instance", {
      pluginName: this.pluginInfo.name,
      activationId: this.activationId,
      rendererMethods,
      attributes
    });
    if (!activated)
      throw new Error(`${this.pluginInfo.name} runtime main instance is unavailable.`);
    this.active = true;
  }

  callMainMethod(methodName: string, args: unknown[]) {
    if (this.disposed) return null;
    return this.engine.request("call-main", {
      pluginName: this.pluginInfo.name,
      activationId: this.activationId,
      methodName,
      args
    });
  }

  markDisposed() {
    this.disposed = true;
    this.active = false;
  }
}

export default class MainRuntimePluginEngine {
  private readonly pluginDir: string;
  private readonly plugins: Map<string, RuntimePluginData> = new Map();
  private readonly pluginDiagnostics: PluginDiagnostics;
  private readonly message: MainAppMessage;
  private readonly pendingRequests: Map<string, PendingRequest> = new Map();

  private child: UtilityProcess | null = null;
  private destroyed = false;
  private requestId = 0;
  private restartPromise: Promise<void> | null = null;
  private restartRendererRequested = false;
  private stoppedWorkQueue: Promise<void> = Promise.resolve();

  constructor(
    message: MainAppMessage,
    {
      pluginDir,
      pluginDiagnostics
    }: {
      pluginDir: string;
      pluginDiagnostics: PluginDiagnostics;
    }
  ) {
    this.message = message;
    this.pluginDir = pluginDir;
    this.pluginDiagnostics = pluginDiagnostics;
  }

  private spawnChild() {
    if (this.destroyed) throw new Error("Runtime plugin engine has been destroyed.");
    if (this.child) return this.child;

    const child = utilityProcess.fork(runtimeMainHostPath, [], {
      serviceName: "repair2-plugin-runtime",
      stdio: "inherit"
    });
    this.child = child;
    child.on("message", (message) => this.handleMessage(child, message as RuntimeHostMessage));
    child.on("exit", (code) => this.handleExit(child, code));
    child.on("error", (type, location, report) => {
      logger.error("Runtime plugin utility process error.", { type, location, report });
    });
    return child;
  }

  private handleMessage(child: UtilityProcess, message: RuntimeHostMessage) {
    if (message.type === "renderer-call") {
      if (child !== this.child) return;
      this.message.sendToPlay("plugin:runtime:to-renderer", {
        pluginName: message.pluginName,
        activationId: message.activationId,
        methodName: message.methodName,
        args: message.args
      });
      return;
    }
    if (message.type === "diagnostic") {
      this.reportDiagnostic(message);
      return;
    }

    const pending = this.pendingRequests.get(message.replyTo);
    if (!pending || pending.child !== child) return;
    this.pendingRequests.delete(message.replyTo);
    if (message.ok) pending.resolve(message.result);
    else pending.reject(deserializeRuntimeError(message.error));
  }

  private handleExit(child: UtilityProcess, code: number) {
    if (this.child === child) {
      this.child = null;
      this.plugins.forEach((plugin) => {
        plugin.ready = false;
        plugin.importing = null;
        plugin.instance?.markDisposed();
        delete plugin.instance;
      });
    }
    const error = new Error(`Runtime plugin utility process exited with code ${code}.`);
    this.pendingRequests.forEach((pending, id) => {
      if (pending.child !== child) return;
      this.pendingRequests.delete(id);
      pending.reject(error);
    });
  }

  private reportDiagnostic(diagnostic: RuntimeHostDiagnostic) {
    const error = deserializeRuntimeError(diagnostic.error);
    switch (diagnostic.kind) {
      case "load":
        this.pluginDiagnostics.runtimeMainLoadFailed(diagnostic.plugin, error);
        break;
      case "factory":
        this.pluginDiagnostics.runtimeMainFactoryFailed(diagnostic.plugin, error);
        break;
      case "method":
        this.pluginDiagnostics.runtimeMainMethodFailed(
          diagnostic.plugin,
          diagnostic.methodName ?? "unknown",
          error
        );
        break;
      case "disposer":
        this.pluginDiagnostics.runtimeMainDisposerFailed(diagnostic.plugin, error);
        break;
      case "dispose":
        this.pluginDiagnostics.runtimeMainDisposeFailed(diagnostic.plugin, error);
        break;
    }
  }

  private sendRequest<TType extends RuntimeHostRequestType, TResult = unknown>(
    child: UtilityProcess,
    type: TType,
    payload: RuntimeHostRequestPayload<TType>
  ): Promise<TResult> {
    const id = String(++this.requestId);
    return new Promise<TResult>((resolve, reject) => {
      this.pendingRequests.set(id, {
        child,
        resolve: resolve as (value: unknown) => void,
        reject
      });
      try {
        child.postMessage({ id, type, payload } as RuntimeHostRequest);
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  async request<TType extends RuntimeHostRequestType, TResult = unknown>(
    type: TType,
    payload: RuntimeHostRequestPayload<TType>
  ): Promise<TResult> {
    if (this.restartPromise) await this.restartPromise;
    return this.sendRequest<TType, TResult>(this.spawnChild(), type, payload);
  }

  updatePlugin(pluginInfo: PluginInfo, forceImport = false) {
    if (pluginInfo.type !== "runtime" || !pluginInfo.main) return null;
    if (!forceImport && this.plugins.has(pluginInfo.name)) return this.getPlugin(pluginInfo.name);

    const previous = this.plugins.get(pluginInfo.name);
    const tempData: RuntimePluginData = {
      info: pluginInfo,
      ready: false,
      instance: previous?.instance
    };
    logger.info(
      `LOADING PLUGIN: ${pluginInfo.name}(${join(this.pluginDir, pluginInfo.mainDistFile as string)})`
    );
    const importing = this.request<"update-plugin", boolean>("update-plugin", {
      pluginDir: this.pluginDir,
      pluginInfo,
      forceImport
    })
      .then((loaded) => {
        if (this.plugins.get(pluginInfo.name) !== tempData || tempData.importing !== importing)
          return false;
        tempData.importing = null;
        tempData.ready = loaded;
        if (loaded) logger.info("PLUGIN LOADED: " + pluginInfo.name);
        return loaded;
      })
      .catch((error) => {
        if (this.plugins.get(pluginInfo.name) === tempData && tempData.importing === importing) {
          tempData.importing = null;
          tempData.ready = false;
        }
        this.pluginDiagnostics.runtimeMainLoadFailed(pluginInfo, error);
        return false;
      });
    tempData.importing = importing;
    this.plugins.set(pluginInfo.name, tempData);
    return this.getPlugin(pluginInfo.name);
  }

  private async getPlugin(pluginName: string) {
    if (this.restartPromise) await this.restartPromise;
    while (true) {
      const target = this.plugins.get(pluginName);
      if (!target) return false;
      if (target.ready) return true;
      const importing = target.importing;
      if (!importing) return false;
      await importing;
      if (this.plugins.get(pluginName) === target) return target.ready;
    }
  }

  getPluginInstance(pluginName: string) {
    return this.plugins.get(pluginName)?.instance ?? null;
  }

  getActiveInstance(pluginName: string, activationId: string) {
    const instance = this.getPluginInstance(pluginName);
    if (!instance || instance.activationId !== activationId || instance.disposed) return null;
    return instance;
  }

  async createInstance(pluginName: string, activationId: string) {
    if (!(await this.getPlugin(pluginName))) {
      await this.disposeInstance(pluginName);
      return null;
    }
    const target = this.plugins.get(pluginName);
    if (!target) return null;

    target.instance?.markDisposed();
    const instance = new RuntimePluginInstanceProxy(this, target.info, activationId, []);
    target.instance = instance;
    let result: { mainMethods: string[] } | null;
    try {
      result = await this.request<"create-instance", { mainMethods: string[] } | null>(
        "create-instance",
        { pluginName, activationId }
      );
    } catch (error) {
      instance.markDisposed();
      if (target.instance === instance) delete target.instance;
      throw error;
    }
    if (target.instance !== instance || !result) {
      instance.markDisposed();
      if (target.instance === instance) delete target.instance;
      return null;
    }

    instance.mainMethods = result.mainMethods;
    return instance;
  }

  async removePlugin(pluginName: string) {
    const target = this.plugins.get(pluginName);
    if (!target) return false;
    target.instance?.markDisposed();
    this.plugins.delete(pluginName);
    try {
      return await this.request<"remove-plugin", boolean>("remove-plugin", { pluginName });
    } catch (error) {
      this.pluginDiagnostics.runtimeMainDisposeFailed(target.info, error);
      return false;
    }
  }

  async removeAllPluginExcept(pluginNames: string[]) {
    const exceptNames = new Set(pluginNames);
    this.plugins.forEach((plugin, pluginName) => {
      if (exceptNames.has(pluginName)) return;
      plugin.instance?.markDisposed();
      this.plugins.delete(pluginName);
    });
    if (!this.child) return;
    try {
      await this.request("remove-all-except", { pluginNames });
    } catch (error) {
      logger.error("Failed to remove runtime main plugins.", error as any);
    }
  }

  async disposeInstance(pluginName: string, activationId?: string) {
    const target = this.plugins.get(pluginName);
    const instance = target?.instance;
    if (!target || !instance) return false;
    if (activationId && instance.activationId !== activationId) return false;

    instance.markDisposed();
    if (target.instance === instance) delete target.instance;
    try {
      return await this.request<"dispose-instance", boolean>("dispose-instance", {
        pluginName,
        activationId
      });
    } catch (error) {
      this.pluginDiagnostics.runtimeMainDisposeFailed(target.info, error);
      return false;
    }
  }

  async disposeAll() {
    this.plugins.forEach((plugin) => {
      plugin.instance?.markDisposed();
      delete plugin.instance;
    });
    if (!this.child) return;
    try {
      await this.request("dispose-all", {});
    } catch (error) {
      logger.error("Failed to dispose runtime main plugins.", error as any);
    }
  }

  private waitForExit(child: UtilityProcess) {
    return new Promise<void>((resolve) => child.once("exit", () => resolve()));
  }

  private async stopChild() {
    const child = this.child;
    if (!child) return;
    const exitPromise = this.waitForExit(child);

    try {
      await withTimeout(
        this.sendRequest(child, "shutdown", {}),
        DISPOSE_TIMEOUT_MS,
        "Runtime plugin utility process disposal timed out."
      );
    } catch (error) {
      logger.warning("Runtime plugin utility process did not dispose cleanly.", error as any);
    }

    child.kill();
    await withTimeout(exitPromise, EXIT_TIMEOUT_MS, "Runtime plugin utility process did not exit.");
    if (this.child === child) this.child = null;
  }

  private startRestart<T>(work: () => Promise<T>) {
    this.plugins.forEach((plugin) => {
      plugin.instance?.markDisposed();
      delete plugin.instance;
      plugin.ready = false;
      plugin.importing = null;
    });

    let result!: T;
    let workError: unknown;
    let hasWorkError = false;
    const restart = async () => {
      await this.stopChild();
      try {
        result = await work();
      } catch (error) {
        workError = error;
        hasWorkError = true;
      }
      if (this.destroyed || this.plugins.size === 0) return;

      const child = this.spawnChild();
      await Promise.all(
        [...this.plugins.values()].map((plugin) => {
          const importing = this.sendRequest<"update-plugin", boolean>(child, "update-plugin", {
            pluginDir: this.pluginDir,
            pluginInfo: plugin.info,
            forceImport: true
          })
            .then((loaded) => {
              plugin.ready = loaded;
              return loaded;
            })
            .catch((error) => {
              plugin.ready = false;
              this.pluginDiagnostics.runtimeMainLoadFailed(plugin.info, error);
              return false;
            });
          plugin.importing = importing;
          return importing.finally(() => {
            if (plugin.importing === importing) plugin.importing = null;
          });
        })
      );
      if (this.restartRendererRequested) this.message.sendToPlay("plugin:runtime:restart");
    };
    let completion: Promise<void>;
    completion = restart().finally(() => {
      if (this.restartPromise !== completion) return;
      this.restartRendererRequested = false;
      this.restartPromise = null;
    });
    this.restartPromise = completion;
    return completion.then(() => {
      if (hasWorkError) throw workError;
      return result;
    });
  }

  restart(restartRenderer = false) {
    if (this.destroyed) return Promise.resolve();
    this.restartRendererRequested ||= restartRenderer;
    if (this.restartPromise) return this.restartPromise;
    return this.startRestart(async () => undefined);
  }

  withPluginsStopped<T>(work: () => Promise<T>): Promise<T> {
    const run = async () => {
      if (this.restartPromise) await this.restartPromise.catch(() => undefined);
      if (this.destroyed) throw new Error("Runtime plugin engine has been destroyed.");
      this.restartRendererRequested = true;
      return this.startRestart(work);
    };
    const queued = this.stoppedWorkQueue.then(run, run);
    this.stoppedWorkQueue = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  }

  async shutdown() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.plugins.forEach((plugin) => plugin.instance?.markDisposed());
    if (this.restartPromise) await this.restartPromise;
    await this.stopChild();
    this.plugins.clear();
  }
}
