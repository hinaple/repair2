import type { ElementContext, FrameContext, FunctionContext, TransitionContext } from "./context";
import type { Attributes, MaybePromise } from "./shared";

export type PluginUnmount = () => MaybePromise<void>;

export interface ElementMountArgs<TAttributes = Attributes> {
    attributes: TAttributes;
    ctx: ElementContext;
}

export interface ElementMountOptions {
    target: HTMLElement;
    dispatchEvent(type: string, event?: unknown): void;
}

export interface FrameMountArgs<TAttributes = Attributes> {
    attributes: TAttributes;
    ctx: FrameContext;
}

export interface FrameMountOptions {
    target: HTMLElement;
    children: DocumentFragment;
    showIntro: boolean;
}

/** Mount function contract for element plugins. */
export type ElementPlugin<TAttributes = Attributes> = (
    args: ElementMountArgs<TAttributes>,
    options: ElementMountOptions
) => MaybePromise<void | PluginUnmount>;

/** Mount function contract for frame plugins. */
export type FramePlugin<TAttributes = Attributes> = (
    args: FrameMountArgs<TAttributes>,
    options: FrameMountOptions
) => MaybePromise<void | PluginUnmount>;

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
    /** Event-like payload when called as an element listener plugin. */
    event?: unknown;
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
) => MaybePromise<Keyframe[] | (() => Keyframe[])>;

/**
 * Transition plugin export contract.
 * Export an object with static `keyframes` or a `function` that returns keyframes.
 * Direct keyframe array exports are not part of this contract.
 */
export interface TransitionPlugin<TAttributes = Attributes> {
    keyframes?: Keyframe[] | (() => Keyframe[]);
    function?: TransitionHandler<TAttributes>;
    [key: string]: unknown;
}

export type TransitionFactory<TAttributes = Attributes> = () => MaybePromise<
    TransitionPlugin<TAttributes>
>;

export type TransitionExport<TAttributes = Attributes> =
    | TransitionPlugin<TAttributes>
    | TransitionFactory<TAttributes>;
