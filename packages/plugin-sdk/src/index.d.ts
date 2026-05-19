export type Unsubscribe = () => void;
export type MaybePromise<T> = T | Promise<T>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type PluginAttributes = Record<string, unknown>;
export type RepairPluginType =
    | "runtime"
    | "element"
    | "frame"
    | "function"
    | "transition"
    | (string & {});

export interface RepairPluginIdentity {
    id: string;
    type: RepairPluginType;
    instanceId: string;
}

export interface RepairComponentIdentity {
    id: string;
    realId: string;
    alias: string | null;
}

export interface RepairElementIdentity {
    id: string;
    realId: string;
    alias: string | null;
    type: string;
}

export interface RepairFrameIdentity {
    id: string;
    realId: string;
    alias: string | null;
}

export interface RepairPluginEvent<T = unknown> {
    channel: string;
    data: T;
    scope: RepairEventScope;
    source: RepairPluginIdentity;
    timestamp: number;
}

export type RepairEventScope = "repair" | "plugin" | "local";

export interface RepairEventOptions {
    scope?: RepairEventScope;
}

export interface RepairLifecycleApi {
    readonly disposed: boolean;
    onDispose(disposer: Unsubscribe): Unsubscribe;
    dispose(): void;
}

export interface RepairServiceApi {
    provide<TService extends object>(name: string, service: TService): Unsubscribe;
    use<TService extends object = Record<string, unknown>>(name: string): TService | null;
    tryUse<TService extends object = Record<string, unknown>>(name: string): TService | null;
    has(name: string): boolean;
}

export interface RepairPluginContextBase {
    plugin: RepairPluginIdentity;
    logger: RepairLoggerApi;
    events: RepairEventApi;
    components: RepairComponentApi;
    variables: RepairVariableApi;
    resources: RepairResourceApi;
    app: RepairAppApi;
    communication: RepairCommunicationApi;
    store: RepairStoreApi;
}

export interface RepairLongLivedPluginContext extends RepairPluginContextBase {
    services: RepairServiceApi;
    lifecycle: RepairLifecycleApi;
}

export interface RepairRuntimePluginContext extends RepairLongLivedPluginContext {
    component: null;
    element: null;
    frame: null;
}

export interface RepairElementPluginContext extends RepairLongLivedPluginContext {
    component: RepairComponentIdentity;
    element: RepairElementIdentity;
    frame: null;
}

export interface RepairFramePluginContext extends RepairLongLivedPluginContext {
    component: RepairComponentIdentity;
    element: null;
    frame: RepairFrameIdentity;
}

export interface RepairShortLivedPluginContext extends RepairPluginContextBase {
    component: RepairComponentIdentity | null;
    element: RepairElementIdentity | null;
    frame: RepairFrameIdentity | null;
    services: RepairServiceApi;
    lifecycle: RepairLifecycleApi;
}

export interface RepairFunctionPluginContext extends RepairShortLivedPluginContext {}

export interface RepairTransitionPluginContext extends RepairShortLivedPluginContext {}

export type RepairPluginContext =
    | RepairRuntimePluginContext
    | RepairElementPluginContext
    | RepairFramePluginContext
    | RepairFunctionPluginContext
    | RepairTransitionPluginContext;

interface RepairPlugin {
    attributes?: string[];
    dependencies?: Record<string, string> | string[];
}

export interface RepairRuntimePlugin extends RepairPlugin {
    /**
     * Declares executable runtime methods exposed as steps.
     *
     * Every declared step name must match a method with the same name
     * implemented by this runtime plugin.
     *
     * Use `string[]` when declaring method names only. Methods declared this way
     * cannot define additional step attributes.
     *
     * Use `Record<string, string[]>` when methods require their own attributes.
     * In this form, each key is a method name and its value is the list of
     * attribute names supported by that method.
     *
     * Example:
     * steps: ["click", "input"]
     *
     * Example:
     * steps: {
     *   click: ["selector"],
     *   input: ["selector", "value"]
     * }
     */
    steps?: string[] | Record<string, string[]>;
    activate(args: RepairRuntimePluginArgs): MaybePromise<void | Unsubscribe>;
    [key: string]: ((args: RepairRuntimePluginArgs) => MaybePromise<boolean>) | unknown;
}

export interface RepairRuntimePluginArgs<TAttributes = PluginAttributes> {
    attributes: TAttributes;
    modules?: Record<string, unknown> | null;
    ctx: RepairRuntimePluginContext;
    [key: string]: unknown;
}

export interface RepairAppApi {
    readonly devMode: boolean;
    getSizeRatio(): [number, number];
    getConfig(): Readonly<Record<string, unknown>>;
    getScreenSize(): { width: number; height: number };
    internal: RepairInternalAppApi;
}

export interface RepairInternalAppApi {
    /** Returns the mutable internal AppData object. This is not a stable public contract. */
    getAppData(): unknown;
}

export interface RepairCommunicationApi {
    socketSend(channel: string, ...data: unknown[]): void;
    serialSend(data: string): void;
}

export interface RepairStoreApi {
    get<T = unknown>(key: string): T;
    set(key: string, value: unknown): void;
}

export interface RepairComponentApi {
    /** Returns handles for current runtime components, including invisible components. */
    list(): RepairComponentHandle[];
    /** Looks up by plugin-facing id (`alias || id`) or by real project uuid. */
    get(id: string): RepairComponentHandle | null;
    subscribe(listener: (components: RepairComponentHandle[]) => void): Unsubscribe;
    remove(id: string, options?: RepairComponentRemoveOptions): void;
    clear(options?: RepairComponentClearOptions): void;
    modify(id: string, key: string, value: unknown): void;
    setVisible(id: string, visible: boolean): void;
    setZIndex(id: string, zIndex: number): void;
    setStyle(id: string, style: string): void;
}

export interface RepairComponentRemoveOptions {
    ignoreUnbreakable?: boolean;
}

export interface RepairComponentClearOptions {
    ignoreUnbreakable?: boolean;
}

export interface RepairComponentHandle {
    id: string;
    realId: string;
    alias: string | null;
    visible: boolean;
    zIndex: number | null;
    element: HTMLElement;
    meta: RepairComponentMeta;
}

export interface RepairComponentMeta extends Record<string, unknown> {
    unbreakable: boolean;
    hasFrame: boolean;
    elementCount: number;
}

export interface RepairVariableApi {
    /** Looks up a runtime variable by project variable name. Missing variables report a plugin warning. */
    get(variableName: string): unknown;
    set(variableName: string, value: unknown): void;
    subscribe(variableName: string, listener: (value: unknown) => void): Unsubscribe;
}

export interface RepairEventApi {
    /** Defaults to `{ scope: "repair" }`, which can activate project event entries. */
    emit(channel: string, data?: unknown, options?: RepairEventOptions): void;
    on<TData = unknown>(
        channel: string,
        listener: (event: RepairPluginEvent<TData>) => void,
        options?: RepairEventOptions
    ): Unsubscribe;
}

export interface RepairResourceApi {
    list(): RepairResourceHandle[];
    /** Looks up a resource by runtime resource title. */
    get(resourceTitle: string): RepairResourceHandle | null;
    createElement(resourceTitle: string): HTMLElement | null;
    getPath(resourceTitle: string): string | null;
    addPreload(resourceTitle: string): void;
    removePreload(resourceTitle: string): void;
    isPreloaded(resourceTitle: string): boolean;
}

export interface RepairResourceHandle {
    id: string;
    title: string;
    alias: string | null;
    type: string | null;
    src: string | null;
    path: string | null;
    meta: RepairResourceMeta;
}

export interface RepairResourceMeta extends Record<string, unknown> {
    extension: string | null;
    preloaded: boolean;
}

export interface RepairLoggerApi {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

export interface RepairContextualPluginOptions {
    attributes?: PluginAttributes;
    modules?: Record<string, unknown> | null;
    ctx?: RepairPluginContext | null;
}

export interface RepairElementPluginConstructor extends RepairPlugin {
    new (options: RepairElementPluginOptions): HTMLElement;
}

export interface RepairElementPluginOptions extends Omit<RepairContextualPluginOptions, "ctx"> {
    isDev?: boolean;
    ctx?: RepairElementPluginContext | null;
}

export interface RepairFramePluginConstructor extends RepairPlugin {
    new (options: RepairFramePluginOptions): HTMLElement;
}

export interface RepairFramePluginOptions extends Omit<RepairContextualPluginOptions, "ctx"> {
    isDev?: boolean;
    ctx?: RepairFramePluginContext | null;
}

export interface RepairFunctionPlugin<TAttributes = PluginAttributes, TResult = unknown>
    extends RepairPlugin {
    function: RepairFunctionPluginHandler<TAttributes, TResult>;
}

export type RepairFunctionPluginHandler<TAttributes = PluginAttributes, TResult = unknown> = (
    args: RepairFunctionPluginArgs<TAttributes>
) => MaybePromise<TResult>;

export interface RepairFunctionPluginArgs<TAttributes = PluginAttributes> {
    attributes: TAttributes;
    modules?: Record<string, unknown> | null;
    ctx?: RepairFunctionPluginContext | null;
    signal?: AbortSignal;
    [key: string]: unknown;
}

export interface RepairTransitionPluginArgs<TAttributes = PluginAttributes> {
    attributes?: TAttributes;
    modules?: Record<string, unknown> | null;
    ctx?: RepairTransitionPluginContext | null;
    signal?: AbortSignal;
    [key: string]: unknown;
}

export interface RepairTransitionPlugin<TAttributes = PluginAttributes> extends RepairPlugin {
    keyframes?: Keyframe[];
    function?: RepairTransitionPluginHandler<TAttributes>;
}

export type RepairTransitionPluginHandler<TAttributes = PluginAttributes> = (
    args?: RepairTransitionPluginArgs<TAttributes>
) => MaybePromise<Keyframe[]>;

export declare function defineRuntimePlugin<T extends RepairRuntimePlugin>(plugin: T): T;
export declare function defineElementPlugin<T extends RepairElementPluginConstructor>(
    pluginClass: T
): T;
export declare function defineFramePlugin<T extends RepairFramePluginConstructor>(
    pluginClass: T
): T;
export declare function defineFunctionPlugin<T extends RepairFunctionPlugin>(plugin: T): T;
export declare function defineTransitionPlugin(
    plugin: RepairTransitionPlugin | Keyframe[]
): RepairTransitionPlugin;
