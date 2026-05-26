import type { ElementContext, FrameContext, FunctionContext, TransitionContext } from "./context";
import type { Attributes, MaybePromise } from "./shared";

export interface ElementOptions<TAttributes = Attributes> {
    attributes?: TAttributes;
    ctx?: ElementContext | null;
}

export interface FrameOptions<TAttributes = Attributes> {
    attributes?: TAttributes;
    ctx?: FrameContext | null;
}

/** HTMLElement constructor contract for element plugins. */
export interface ElementPlugin<TAttributes = Attributes> {
    new (options?: ElementOptions<TAttributes>): HTMLElement;
}

/** HTMLElement constructor contract for frame plugins. */
export interface FramePlugin<TAttributes = Attributes> {
    new (options?: FrameOptions<TAttributes>): HTMLElement;
}

export type ElementExport<TAttributes = Attributes> = ElementPlugin<TAttributes>;

export type FrameExport<TAttributes = Attributes> = FramePlugin<TAttributes>;

export interface FunctionArgs<TAttributes = Attributes> {
    /** Stored plugin pointer payloads passed to this call. */
    attributes: TAttributes;
    ctx: FunctionContext;
    /** Present when the caller has a cancellation/reset path. */
    signal?: AbortSignal;
    /** Listener channel when called as an element listener plugin. */
    channel?: string;
    /** DOM event when called as an element listener plugin. */
    event?: Event;
    [key: string]: unknown;
}

export type FunctionHandler<TAttributes = Attributes, TResult = unknown> = (
    args: FunctionArgs<TAttributes>
) => MaybePromise<TResult>;

/**
 * Function plugin export contract.
 * The current runtime calls the `function` property; bare function exports are not part of this contract.
 */
export interface FunctionPlugin<TAttributes = Attributes, TResult = unknown> {
    function: FunctionHandler<TAttributes, TResult>;
    [key: string]: unknown;
}

export type FunctionFactory<TAttributes = Attributes, TResult = unknown> = () => MaybePromise<
    FunctionPlugin<TAttributes, TResult>
>;

export type FunctionExport<TAttributes = Attributes, TResult = unknown> =
    | FunctionPlugin<TAttributes, TResult>
    | FunctionFactory<TAttributes, TResult>;

export interface TransitionArgs<TAttributes = Attributes> {
    attributes: TAttributes;
    ctx: TransitionContext;
    [key: string]: unknown;
}

export type TransitionHandler<TAttributes = Attributes> = (
    args: TransitionArgs<TAttributes>
) => MaybePromise<Keyframe[]>;

/**
 * Transition plugin export contract.
 * Export an object with static `keyframes` or a `function` that returns keyframes.
 * Direct keyframe array exports are not part of this contract.
 */
export interface TransitionPlugin<TAttributes = Attributes> {
    keyframes?: Keyframe[];
    function?: TransitionHandler<TAttributes>;
    [key: string]: unknown;
}

export type TransitionFactory<TAttributes = Attributes> = () => MaybePromise<
    TransitionPlugin<TAttributes>
>;

export type TransitionExport<TAttributes = Attributes> =
    | TransitionPlugin<TAttributes>
    | TransitionFactory<TAttributes>;
