import type { LifecycleApi, RuntimeContext } from "./context";
import type { Attributes, Disposer, MaybePromise, MethodMap, MethodShape } from "./shared";

/**
 * Renderer-side API for calling methods exposed by a runtime plugin main entry.
 * Calls target the main entry paired with the current renderer activation.
 * They cross IPC and therefore always return a Promise.
 */
export type MainApi<TMain extends MethodShape<TMain> = MethodMap> = {
    [K in keyof TMain]: TMain[K] extends (...args: infer TArgs) => infer TResult
        ? (...args: TArgs) => Promise<Awaited<TResult>>
        : never;
};

/**
 * Main-entry-side API for calling renderer methods exposed by a runtime plugin.
 * Calls are fire-and-forget. Main code cannot observe renderer return values or await completion.
 */
export type RendererApi<TRenderer extends MethodShape<TRenderer> = MethodMap> = {
    [K in keyof TRenderer]: TRenderer[K] extends (...args: infer TArgs) => unknown
        ? (...args: TArgs) => void
        : never;
};

export type RendererMethods = MethodMap;
export type MainMethods = MethodMap;

export interface RuntimeArgs<TAttributes = Attributes> {
    attributes: TAttributes;
    ctx: RuntimeContext;
    [key: string]: unknown;
}

export interface RuntimeActivateArgs<
    TAttributes = Attributes,
    TMain extends MethodShape<TMain> = MethodMap
> extends RuntimeArgs<TAttributes> {
    main: MainApi<TMain> | null;
}

export type RuntimeActivate<
    TAttributes = Attributes,
    TMain extends MethodShape<TMain> = MethodMap
> = (args: RuntimeActivateArgs<TAttributes, TMain>) => MaybePromise<void | Disposer>;

/**
 * Runtime step method type.
 * The method name must match a step declared in the runtime plugin manifest.
 */
export type RuntimeStep<TAttributes = Attributes, TResult = unknown> = (
    args: RuntimeArgs<TAttributes>
) => MaybePromise<TResult>;

export type RuntimeSteps<TAttributes = Attributes> = Record<string, RuntimeStep<TAttributes>>;

/**
 * Renderer-side runtime plugin export object.
 * Runtime plugins may export this object directly or export a factory that returns it.
 * Cleanup can be registered with `ctx.lifecycle.onDispose`, returned from `activate()`,
 * or provided as `dispose`.
 */
export type RuntimePlugin<
    TAttributes = Attributes,
    TMain extends MethodShape<TMain> = MethodMap,
    TRenderer extends MethodShape<TRenderer> = MethodMap,
    TSteps extends object = Record<string, unknown>
> = {
    activate?: RuntimeActivate<TAttributes, TMain>;
    renderer?: TRenderer;
    dispose?: Disposer;
} & TSteps;

export type RuntimeFactory<
    TAttributes = Attributes,
    TMain extends MethodShape<TMain> = MethodMap,
    TRenderer extends MethodShape<TRenderer> = MethodMap,
    TSteps extends object = Record<string, unknown>
> = () => MaybePromise<RuntimePlugin<TAttributes, TMain, TRenderer, TSteps>>;

export type RuntimeExport<
    TAttributes = Attributes,
    TMain extends MethodShape<TMain> = MethodMap,
    TRenderer extends MethodShape<TRenderer> = MethodMap,
    TSteps extends object = Record<string, unknown>
> =
    | RuntimePlugin<TAttributes, TMain, TRenderer, TSteps>
    | RuntimeFactory<TAttributes, TMain, TRenderer, TSteps>;

/** Minimal context passed to a runtime plugin main entry. */
export interface RuntimeMainContext {
    lifecycle: LifecycleApi;
}

export interface RuntimeMainArgs<
    TAttributes = Attributes,
    TRenderer extends MethodShape<TRenderer> = MethodMap
> {
    attributes: TAttributes;
    ctx: RuntimeMainContext;
    renderer: RendererApi<TRenderer>;
}

export type RuntimeMainActivate<
    TAttributes = Attributes,
    TRenderer extends MethodShape<TRenderer> = MethodMap
> = (args: RuntimeMainArgs<TAttributes, TRenderer>) => MaybePromise<void | Disposer>;

/**
 * Main-process entry contract for a runtime plugin with `main` in its manifest.
 * This is not a separate plugin type.
 * Main cleanup should use `ctx.lifecycle.onDispose` or a disposer returned from `activate()`.
 */
export interface RuntimeMain<
    TAttributes = Attributes,
    TMain extends MethodShape<TMain> = MethodMap,
    TRenderer extends MethodShape<TRenderer> = MethodMap
> {
    activate?: RuntimeMainActivate<TAttributes, TRenderer>;
    main?: TMain;
    [key: string]: unknown;
}

/** Runtime main factories are expected to return the main export object synchronously. */
export type RuntimeMainFactory<
    TAttributes = Attributes,
    TMain extends MethodShape<TMain> = MethodMap,
    TRenderer extends MethodShape<TRenderer> = MethodMap
> = () => RuntimeMain<TAttributes, TMain, TRenderer>;

export type RuntimeMainExport<
    TAttributes = Attributes,
    TMain extends MethodShape<TMain> = MethodMap,
    TRenderer extends MethodShape<TRenderer> = MethodMap
> = RuntimeMain<TAttributes, TMain, TRenderer> | RuntimeMainFactory<TAttributes, TMain, TRenderer>;
