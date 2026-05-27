import type { Disposer, PluginType } from "./shared";

export interface PluginIdentity {
    id: string;
    type: PluginType;
    instanceId: string;
}

export interface ComponentIdentity {
    id: string;
    realId: string;
    alias: string | null;
}

export interface ElementIdentity {
    id: string;
    realId: string;
    alias: string | null;
    type: string;
}

export interface FrameIdentity {
    id: string;
    realId: string;
    alias: string | null;
}

export type EventScope = "repair" | "plugin" | "local";

export interface EventOptions {
    scope?: EventScope;
}

export interface PluginEvent<TData = unknown> {
    channel: string;
    data: TData;
    scope: EventScope;
    source: PluginIdentity;
    timestamp: number;
}

/**
 * Cleanup hooks tied to the current plugin instance.
 * Disposers run when the plugin instance is replaced, removed, or explicitly disposed.
 * Most plugins should register cleanup instead of calling `dispose()` directly.
 */
export interface LifecycleApi {
    readonly disposed: boolean;
    onDispose(disposer: Disposer): Disposer;
    dispose(): void;
}

export interface LoggerApi {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

export interface EventApi {
    /**
     * Defaults to the `repair` scope, which can trigger project event entries.
     * Use `plugin` or `local` scope for plugin-only coordination.
     */
    emit(channel: string, data?: unknown, options?: EventOptions): void;
    on<TData = unknown>(
        channel: string,
        listener: (event: PluginEvent<TData>) => void,
        options?: EventOptions
    ): Disposer;
}

/**
 * Named service registry shared inside the play runtime.
 * Use namespaced service names to avoid collisions with other plugins.
 */
export interface ServiceApi {
    provide<TService extends object>(name: string, service: TService): Disposer;
    /** Reports a plugin issue when the service is missing. */
    use<TService extends object = Record<string, unknown>>(name: string): TService | null;
    /** Returns null quietly when the service is missing. */
    tryUse<TService extends object = Record<string, unknown>>(name: string): TService | null;
    has(name: string): boolean;
}

export interface ComponentApi {
    list(): ComponentHandle[];
    get(id: string): ComponentHandle | null;
    subscribe(listener: (components: ComponentHandle[]) => void): Disposer;
    remove(id: string, options?: ComponentRemoveOptions): void;
    clear(options?: ComponentClearOptions): void;
    /** Advanced mutation API. Prefer explicit setters when possible. */
    modify(id: string, key: string, value: unknown): void;
    setVisible(id: string, visible: boolean): void;
    setZIndex(id: string, zIndex: number): void;
    /** Sets the runtime override as a CSS declaration string. */
    setStyle(id: string, style: string): void;
}

export interface ComponentRemoveOptions {
    ignoreUnbreakable?: boolean;
}

export interface ComponentClearOptions {
    ignoreUnbreakable?: boolean;
}

/**
 * Snapshot handle for a live runtime component.
 * Do not treat this as permanent project data ownership.
 */
export interface ComponentHandle {
    id: string;
    realId: string;
    alias: string | null;
    visible: boolean;
    zIndex: number | null;
    /** Live component DOM element. Prefer context APIs for stateful changes. */
    element: HTMLElement;
    meta: ComponentMeta;
}

export interface ComponentMeta extends Record<string, unknown> {
    unbreakable: boolean;
    hasFrame: boolean;
    elementCount: number;
}

export interface VariableApi {
    get(variableName: string): unknown;
    set(variableName: string, value: unknown): void;
    subscribe(variableName: string, listener: (value: unknown) => void): Disposer;
}

export interface ResourceApi {
    list(): ResourceHandle[];
    get(resourceTitle: string): ResourceHandle | null;
    createElement(resourceTitle: string): HTMLElement | null;
    getPath(resourceTitle: string): string | null;
    addPreload(resourceTitle: string): void;
    removePreload(resourceTitle: string): void;
    isPreloaded(resourceTitle: string): boolean;
}

export interface ResourceHandle {
    id: string;
    title: string;
    alias: string | null;
    type: string | null;
    /** Stored project resource source value. */
    src: string | null;
    /** Resolved runtime asset path. */
    path: string | null;
    meta: ResourceMeta;
}

export interface ResourceMeta extends Record<string, unknown> {
    extension: string | null;
    preloaded: boolean;
}

export interface AppApi {
    readonly devMode: boolean;
    getSizeRatio(): [number, number];
    getConfig(): Readonly<Record<string, unknown>>;
    getScreenSize(): { width: number; height: number };
    internal: InternalAppApi;
}

export interface InternalAppApi {
    /**
     * Mutable internal app data escape hatch.
     * Prefer stable context APIs when they can express the same behavior.
     */
    getAppData(): unknown;
}

export interface CommunicationApi {
    /** Fire-and-forget socket send. Delivery success is not reported to the plugin. */
    socketSend(channel: string, ...data: unknown[]): void;
    /** Fire-and-forget serial send. Delivery success is not reported to the plugin. */
    serialSend(data: string): void;
}

export interface StoreApi {
    /** Type parameter is an authoring-time hint only; runtime values are not validated. */
    get<T = unknown>(key: string): Promise<T>;
    set(key: string, value: unknown): void;
}

export interface PluginContextBase {
    plugin: PluginIdentity;
    component: ComponentIdentity | null;
    element: ElementIdentity | null;
    frame: FrameIdentity | null;
    logger: LoggerApi;
    events: EventApi;
    components: ComponentApi;
    variables: VariableApi;
    resources: ResourceApi;
    app: AppApi;
    communication: CommunicationApi;
    store: StoreApi;
    services: ServiceApi;
    lifecycle: LifecycleApi;
}

/** Context passed to active runtime plugin methods. */
export interface RuntimeContext extends PluginContextBase {
    component: null;
    element: null;
    frame: null;
}

/** Context passed to element plugin mount functions. */
export interface ElementContext extends PluginContextBase {
    component: ComponentIdentity;
    element: ElementIdentity;
    frame: null;
}

/** Context passed to frame plugin mount functions. */
export interface FrameContext extends PluginContextBase {
    component: ComponentIdentity;
    element: null;
    frame: FrameIdentity;
}

/**
 * Context passed to function plugin calls.
 * Function plugin calls are usually short-lived, so avoid long-lived subscriptions unless cleaned up explicitly.
 */
export interface FunctionContext extends PluginContextBase {}

/**
 * Context passed to transition plugin calls.
 * Transition plugins should usually focus on keyframe generation and avoid long-lived side effects.
 */
export interface TransitionContext extends PluginContextBase {}

/** Union of context objects injected by REPAIR2. Plugins should not construct this manually. */
export type PluginContext =
    | RuntimeContext
    | ElementContext
    | FrameContext
    | FunctionContext
    | TransitionContext;
