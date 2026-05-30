import { genId } from "@classes/utils";
import { emitPluginEvent, addPluginEventListener } from "./pluginEventBus";
import { emitRepairEvent, addRepairEventListener } from "../event";
import {
    providePluginService,
    usePluginService,
    tryUsePluginService,
    hasPluginService
} from "./pluginServices";
import {
    clearComponents,
    getAllComponentHandles,
    getAllComponents,
    getComponent,
    subscribeComponentHandles
} from "../components";
import { getVariableIdByName, getVarByName, setVarByName, subscribeVarByName } from "../variables";
import {
    addPreloadByTitle,
    genElementByTitle,
    getResourceByTitle,
    getResourcePath,
    getResourcePathByTitle,
    isPreloaded,
    isPreloadedByTitle,
    listResources,
    removePreloadByTitle
} from "../resources";
import { reportPluginIssue, reportPluginException, sendPluginLog } from "./pluginReporter";
import { serialSend, socketSend } from "../communication";
import { pluginDisposed } from "./pluginStyles";

const typeMap = {
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

const registeredContextApis = {
    appDataGetter: () => null,
    store: {
        get: () => Promise.resolve(null),
        set: () => {}
    }
};

const contextApiNormalizers = {
    appDataGetter(api) {
        return typeof api === "function" ? api : () => null;
    },
    communication(api = {}) {
        return {
            socketSend: typeof api.socketSend === "function" ? api.socketSend : () => {},
            serialSend: typeof api.serialSend === "function" ? api.serialSend : () => {}
        };
    },
    store(api = {}) {
        return {
            get: typeof api.get === "function" ? api.get : () => Promise.resolve(null),
            set: typeof api.set === "function" ? api.set : () => {}
        };
    }
};

export function registerPluginContextApi(key, api) {
    if (!Object.hasOwn(registeredContextApis, key)) return false;
    registeredContextApis[key] = contextApiNormalizers[key]?.(api) ?? api;
    return true;
}

function normalizePluginType(type) {
    return typeMap[type] ?? type;
}

function createLifecycle(plugin) {
    const disposers = new Set();
    let disposed = false;

    function runDisposer(disposer) {
        try {
            disposer();
        } catch (err) {
            reportPluginException(plugin, "Plugin lifecycle disposer failed.", err);
        }
    }

    return {
        onDispose(disposer) {
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

function createLogger(plugin) {
    return {
        debug: (...args) =>
            sendPluginLog({ level: "debug", source: plugin, title: args.map(String).join(" ") }),
        info: (...args) =>
            sendPluginLog({ level: "info", source: plugin, title: args.map(String).join(" ") }),
        warn: (...args) =>
            sendPluginLog({
                level: "warning",
                source: plugin,
                title: args.map(String).join(" "),
                dialogue: true
            }),
        error: (...args) =>
            sendPluginLog({
                level: "error",
                source: plugin,
                title: args.map(String).join(" "),
                dialogue: true
            })
    };
}

function createEvents(plugin, lifecycle) {
    const localChannel = (channel) => `${plugin.instanceId}:${channel}`;
    const validScopes = new Set(["repair", "plugin", "local"]);

    function normalizeScope(scope) {
        const normalizedScope = scope ?? "repair";
        if (validScopes.has(normalizedScope)) return normalizedScope;

        reportPluginIssue(plugin, `Invalid event scope: ${normalizedScope}`);
        return "repair";
    }

    function hasChannel(channel) {
        if (channel) return true;
        reportPluginIssue(plugin, "Event channel is required.");
        return false;
    }

    function createEvent(channel, data, scope) {
        return {
            channel,
            data,
            scope,
            source: plugin,
            timestamp: Date.now()
        };
    }

    function wrapListener(channel, listener, scope) {
        return (...payload) => {
            try {
                listener(createEvent(channel, payload.length > 1 ? payload : payload[0], scope));
            } catch (err) {
                reportPluginException(plugin, `Event listener failed: ${channel}`, err);
            }
        };
    }

    return {
        emit(channel, data, options = {}) {
            if (!hasChannel(channel)) return;
            const scope = normalizeScope(options.scope);
            if (scope === "repair") {
                emitRepairEvent(channel, data);
                return;
            }
            emitPluginEvent(
                plugin,
                scope === "local" ? localChannel(channel) : channel,
                data,
                scope
            );
        },
        on(channel, listener, options = {}) {
            if (!hasChannel(channel)) return () => {};
            if (typeof listener !== "function") {
                reportPluginIssue(plugin, `Event listener must be a function: ${channel}`);
                return () => {};
            }
            const scope = normalizeScope(options.scope);
            const unsubscribe =
                scope === "repair"
                    ? addRepairEventListener(channel, wrapListener(channel, listener, scope))
                    : addPluginEventListener(
                          plugin,
                          scope === "local" ? localChannel(channel) : channel,
                          scope === "local" ? (event) => listener({ ...event, channel }) : listener
                      );
            lifecycle.onDispose(unsubscribe);
            return unsubscribe;
        }
    };
}

function createServices(plugin, lifecycle) {
    return {
        provide(name, service) {
            const disposeService = providePluginService(plugin, name, service);
            lifecycle.onDispose(disposeService);
            return disposeService;
        },
        use(name) {
            return usePluginService(name, plugin);
        },
        tryUse(name) {
            return tryUsePluginService(name);
        },
        has(name) {
            return hasPluginService(name);
        }
    };
}

function createComponents(plugin, lifecycle, myComponentId = null) {
    return {
        list() {
            return getAllComponentHandles();
        },
        get(aliasOrId = myComponentId) {
            return getAllComponents().find(
                (c) => c.componentData.id === aliasOrId || c.componentData.alias === aliasOrId
            )?.handle;
        },
        subscribe(listener) {
            const unsubscribe = subscribeComponentHandles(listener, plugin);
            lifecycle.onDispose(unsubscribe);
            return unsubscribe;
        },
        clear(ignoreUnbreakable = false) {
            clearComponents(!!ignoreUnbreakable);
        }
    };
}

function createVariables(plugin, lifecycle) {
    function hasVariable(variableName) {
        if (getVariableIdByName(variableName)) return true;
        reportPluginIssue(plugin, `Variable does not exist: ${variableName}`);
        return false;
    }

    return {
        get(variableName) {
            if (!hasVariable(variableName)) return null;
            return getVarByName(variableName);
        },
        set(variableName, value) {
            if (!hasVariable(variableName)) return;
            setVarByName(variableName, value);
        },
        subscribe(variableName, listener) {
            if (!hasVariable(variableName)) return () => {};
            const unsubscribe = subscribeVarByName(variableName, (value) => {
                try {
                    listener(value);
                } catch (err) {
                    reportPluginException(
                        plugin,
                        `Variable subscriber failed: ${variableName}`,
                        err
                    );
                }
            });
            if (!unsubscribe) return () => {};
            lifecycle.onDispose(unsubscribe);
            return unsubscribe;
        }
    };
}

function createResources(plugin) {
    function getResourceTitle(resource) {
        return resource.title ?? resource.alias ?? resource.src?.split(/[\\/]/).pop() ?? "";
    }

    function getResource(resourceTitle) {
        const resource = getResourceByTitle(resourceTitle);
        if (resource) return resource;

        reportPluginIssue(plugin, `Resource does not exist: ${resourceTitle}`);
        return null;
    }

    function createResourceHandle(resource) {
        return {
            id: resource.id,
            title: getResourceTitle(resource),
            alias: resource.alias ?? null,
            type: resource.fileType ?? null,
            src: resource.src ?? null,
            path: getResourcePath(resource),
            meta: {
                extension: resource.extension ?? null,
                preloaded: isPreloaded(resource.id)
            }
        };
    }

    return {
        list() {
            return listResources().map(createResourceHandle);
        },
        get(resourceTitle) {
            const resource = getResource(resourceTitle);
            return resource ? createResourceHandle(resource) : null;
        },
        createElement(resourceTitle) {
            return getResource(resourceTitle) ? genElementByTitle(resourceTitle) : null;
        },
        getPath(resourceTitle) {
            return getResource(resourceTitle) ? getResourcePathByTitle(resourceTitle) : null;
        },
        addPreload(resourceTitle) {
            if (getResource(resourceTitle)) addPreloadByTitle(resourceTitle);
        },
        removePreload(resourceTitle) {
            if (getResource(resourceTitle)) removePreloadByTitle(resourceTitle);
        },
        isPreloaded(resourceTitle) {
            return getResource(resourceTitle) ? isPreloadedByTitle(resourceTitle) : false;
        }
    };
}

function clonePlainData(value) {
    try {
        if (typeof $state?.snapshot === "function") return $state.snapshot(value);
    } catch {}

    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

function createAppApi() {
    return {
        get devMode() {
            return !!registeredContextApis.appDataGetter()?.config?.devMode;
        },
        getSizeRatio() {
            const ratio = (registeredContextApis.appDataGetter()?.config?.sizeRatio || "1")
                .toString()
                .split(",")
                .map((n) => +n);
            return ratio.length === 2 ? ratio : [ratio[0], ratio[0]];
        },
        getConfig() {
            return clonePlainData(registeredContextApis.appDataGetter()?.config ?? {});
        },
        getScreenSize() {
            const config = registeredContextApis.appDataGetter()?.config ?? {};
            const gamezone = document.getElementById("gamezone");
            return {
                width: Number(config.width) || gamezone?.clientWidth || document.body.clientWidth,
                height:
                    Number(config.height) || gamezone?.clientHeight || document.body.clientHeight
            };
        },
        internal: {
            getAppData() {
                return registeredContextApis.appDataGetter();
            }
        }
    };
}

function createStoreApi() {
    return {
        get(key) {
            return Promise.resolve(registeredContextApis.store.get(key));
        },
        set(key, value) {
            registeredContextApis.store.set(key, value);
        }
    };
}

export function createPluginContext({
    pluginId,
    pluginType,
    instanceId = genId(8),
    component = null,
    element = null,
    frame = null
} = {}) {
    const plugin = {
        id: pluginId ?? "unknown",
        type: normalizePluginType(pluginType),
        instanceId
    };
    const lifecycle = createLifecycle(plugin);

    return {
        plugin,
        component,
        element,
        frame,
        logger: createLogger(plugin),
        events: createEvents(plugin, lifecycle),
        components: createComponents(plugin, lifecycle, component?.id ?? null),
        variables: createVariables(plugin, lifecycle),
        resources: createResources(plugin),
        app: createAppApi(),
        communication: {
            socketSend,
            serialSend
        },
        store: createStoreApi(),
        services: createServices(plugin, lifecycle),
        lifecycle
    };
}

export function disposePluginContext(ctx) {
    ctx?.lifecycle?.dispose?.();
}
