import { genId } from "@shared/genId";
import { emitPluginEvent, addPluginEventListener } from "./pluginEventBus";
import { emitRepairEvent, addRepairEventListener } from "../event";
import {
  providePluginService,
  usePluginService,
  tryUsePluginService,
  hasPluginService
} from "./pluginServices";
import { reportPluginWarning, reportPluginException, sendPluginLog } from "./pluginReporter";
import { pluginDisposed } from "./pluginStyles";
import type SDK from "@fainthit/repair2-plugin-sdk";
import type { Project } from "../../project/projectInstance";

type LegacyPluginType = `${Exclude<SDK.PluginType, "runtime">}s`;
type PluginTypeInput = SDK.PluginType | LegacyPluginType | "";

type CreatePluginContextOptions = {
  pluginId?: string;
  pluginType?: PluginTypeInput;
  instanceId?: string;
  component?: SDK.ComponentIdentity | null;
  element?: SDK.ElementIdentity | null;
  frame?: SDK.FrameIdentity | null;
};

const typeMap: Record<Exclude<PluginTypeInput, "">, SDK.PluginType> = {
  runtime: "runtime",
  elements: "element",
  element: "element",
  frames: "frame",
  frame: "frame",
  functions: "function",
  function: "function",
  transitions: "transition",
  transition: "transition"
};

interface ContextApiObject {
  appData: { get(): Project };
  store: SDK.StoreApi;
  communication: SDK.CommunicationApi;
  resource: SDK.ResourceApi;
  component: SDK.ComponentApi;
  variable: SDK.VariableApi;
}
type ContextApi = {
  [k in keyof ContextApiObject]:
    | ContextApiObject[k]
    | ((obj: {
        plugin: SDK.PluginIdentity;
        onDispose: (cb: () => void) => void;
        warn: (...args: string[]) => void;
        error: (content: string, error?: any) => void;
        compId?: string;
      }) => ContextApiObject[k]);
};

interface PluginData {
  plugin: SDK.PluginIdentity;
  lifecycle: SDK.LifecycleApi;
  compId?: string;
}
const registeredContextApis: Partial<ContextApi> = {};
function getApi<K extends keyof ContextApi, C extends ContextApiObject[K]>(
  key: K,
  pluginData?: PluginData
): Readonly<C> {
  let api = registeredContextApis[key];
  if (!api) throw new Error(`Plugin context api "${key}" is not registered.`);

  if (typeof api === "function") {
    if (!pluginData)
      throw new Error(`"${key}" is dynamic plugin context api, but did not recevied plugin data.`);

    api = api({
      plugin: pluginData.plugin,
      onDispose: pluginData.lifecycle.onDispose,
      warn: (...args) => reportPluginWarning(pluginData.plugin, args),
      error: (content, error = null) => reportPluginException(pluginData.plugin, content, error),
      compId: pluginData.compId
    });
  }
  return Object.freeze(api as C);
}
export function registerPluginContextApi<K extends keyof ContextApi>(key: K, api: ContextApi[K]) {
  if (!Object.hasOwn(registeredContextApis, key)) return false;
  registeredContextApis[key] = api;
  return true;
}

function normalizePluginType(type: PluginTypeInput) {
  return type ? typeMap[type] : type;
}

function createLifecycle(plugin: SDK.PluginIdentity): SDK.LifecycleApi {
  const disposers = new Set<SDK.Disposer>();
  let disposed = false;

  function runDisposer(disposer: SDK.Disposer) {
    try {
      disposer();
    } catch (err) {
      reportPluginException(plugin, "Plugin lifecycle disposer failed.", err);
    }
  }

  return {
    onDispose(disposer: SDK.Disposer) {
      if (typeof disposer !== "function") return () => {};
      if (disposed) {
        runDisposer(disposer);
        return () => {};
      }

      disposers.add(disposer);
      return () => disposers.delete(disposer);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pluginDisposed(plugin.type, plugin.id);
      disposers.forEach(runDisposer);
      disposers.clear();
    },
    get disposed() {
      return disposed;
    }
  };
}

function createLogger(plugin: SDK.PluginIdentity): SDK.LoggerApi {
  return {
    debug: (...args: unknown[]) => sendPluginLog({ level: "debug", source: plugin, content: args }),
    info: (...args: unknown[]) => sendPluginLog({ level: "info", source: plugin, content: args }),
    warn: (...args: unknown[]) =>
      sendPluginLog({
        level: "warning",
        source: plugin,
        content: args
      }),
    error: (...args: unknown[]) =>
      sendPluginLog({
        level: "error",
        source: plugin,
        content: args
      })
  };
}

function createEvents(plugin: SDK.PluginIdentity, lifecycle: SDK.LifecycleApi): SDK.EventApi {
  const localChannel = (channel: string) => `${plugin.instanceId}:${channel}`;
  const validScopes = new Set<SDK.EventScope>(["repair", "plugin", "local"]);

  function normalizeScope(scope: SDK.EventOptions["scope"]): SDK.EventScope {
    const normalizedScope = scope ?? "repair";
    if (validScopes.has(normalizedScope)) return normalizedScope;

    reportPluginWarning(plugin, `Invalid event scope: ${normalizedScope}`);
    return "repair";
  }

  function hasChannel(channel: string) {
    if (channel) return true;
    reportPluginWarning(plugin, "Event channel is required.");
    return false;
  }

  function createEvent<TData>(
    channel: string,
    data: TData,
    scope: SDK.EventScope
  ): SDK.PluginEvent<TData> {
    return {
      channel,
      data,
      scope,
      source: plugin,
      timestamp: Date.now()
    };
  }

  function wrapListener<TData>(
    channel: string,
    listener: (event: SDK.PluginEvent<TData>) => void,
    scope: SDK.EventScope
  ) {
    return (...payload: TData[]) => {
      try {
        const data = (payload.length > 1 ? payload : payload[0]) as TData;
        listener(createEvent(channel, data, scope));
      } catch (err) {
        reportPluginException(plugin, `Event listener failed: ${channel}`, err);
      }
    };
  }

  return {
    emit(channel: string, data?: unknown, options: SDK.EventOptions = {}) {
      if (!hasChannel(channel)) return;
      const scope = normalizeScope(options.scope);
      if (scope === "repair") {
        emitRepairEvent(channel, data);
        return;
      }
      emitPluginEvent(plugin, scope === "local" ? localChannel(channel) : channel, data, scope);
    },
    on<TData = unknown>(
      channel: string,
      listener: (event: SDK.PluginEvent<TData>) => void,
      options: SDK.EventOptions = {}
    ) {
      if (!hasChannel(channel)) return () => {};
      if (typeof listener !== "function") {
        reportPluginWarning(plugin, `Event listener must be a function: ${channel}`);
        return () => {};
      }
      const scope = normalizeScope(options.scope);
      const unsubscribe =
        scope === "repair"
          ? addRepairEventListener(channel, wrapListener(channel, listener, scope))
          : addPluginEventListener(
              plugin,
              scope === "local" ? localChannel(channel) : channel,
              scope === "local"
                ? (event: SDK.PluginEvent<TData>) => listener({ ...event, channel })
                : listener
            );
      lifecycle.onDispose(unsubscribe);
      return unsubscribe;
    }
  };
}

function createServices(plugin: SDK.PluginIdentity, lifecycle: SDK.LifecycleApi): SDK.ServiceApi {
  return {
    provide<TService extends object>(name: string, service: TService) {
      const disposeService = providePluginService(plugin, name, service);
      lifecycle.onDispose(disposeService);
      return disposeService;
    },
    use<TService extends object = Record<string, unknown>>(name: string) {
      return usePluginService(name, plugin) as TService;
    },
    tryUse<TService extends object = Record<string, unknown>>(name: string) {
      return tryUsePluginService(name) as TService | null;
    },
    has(name: string) {
      return hasPluginService(name);
    }
  };
}

function createAppApi(): SDK.AppApi {
  return {
    get devMode() {
      return !!getApi("appData").get().data.config.devMode;
    },
    getSizeRatio() {
      const ratio = (getApi("appData").get().data.config.sizeRatio || "1")
        .toString()
        .split(",")
        .map((n) => +n);
      return (ratio.length === 2 ? ratio : [ratio[0], ratio[0]]) as [number, number];
    },
    getConfig() {
      return Object.freeze(getApi("appData").get().data.config);
    },
    getScreenSize() {
      const config = getApi("appData").get().data.config;
      const gamezone = document.getElementById("gamezone");
      return {
        width: Number(config.width) || gamezone?.clientWidth || document.body.clientWidth,
        height: Number(config.height) || gamezone?.clientHeight || document.body.clientHeight
      };
    },
    internal: {
      getAppData() {
        return getApi("appData").get();
      }
    }
  };
}

export function createPluginContext({
  pluginId = "",
  pluginType = "",
  instanceId = genId(8),
  component = null,
  element = null,
  frame = null
}: CreatePluginContextOptions = {}): SDK.PluginContext {
  const plugin: SDK.PluginIdentity = {
    id: pluginId || "unknown",
    type: normalizePluginType(pluginType) as SDK.PluginType,
    instanceId
  };
  const lifecycle = createLifecycle(plugin);

  const pluginData: PluginData = {
    plugin,
    lifecycle,
    compId: component?.id
  };

  return {
    plugin,
    component,
    element,
    frame,
    logger: createLogger(plugin),
    events: createEvents(plugin, lifecycle),
    components: getApi("component", pluginData),
    variables: getApi("variable", pluginData),
    app: createAppApi(),
    resources: getApi("resource", pluginData),
    communication: getApi("communication"),
    store: getApi("store"),
    services: createServices(plugin, lifecycle),
    lifecycle
  };
}

export function disposePluginContext(ctx: Pick<SDK.PluginContext, "lifecycle"> | null | undefined) {
  ctx?.lifecycle?.dispose?.();
}
