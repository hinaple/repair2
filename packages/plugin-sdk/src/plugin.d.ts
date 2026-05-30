import type { ComponentIdentity, ElementContext, FrameContext, FunctionContext } from "./context";
import type { Attributes, MaybePromise } from "./shared";

export type PluginUnmount = () => MaybePromise<void>;
export type TransitionKeyframes = Keyframe[] | PropertyIndexedKeyframes;

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
export type ElementExports<TExports extends Record<string, ElementExport<any>>> = TExports;
export type FrameExports<TExports extends Record<string, FrameExport<any>>> = TExports;

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

/** @deprecated Export a bare function instead. Object exports with a `function` key are legacy-only. */
export interface FunctionPlugin<TAttributes = Attributes, TResult = unknown> {
    function: FunctionHandler<TAttributes, TResult>;
    [key: string]: unknown;
}

export type FunctionExport<TAttributes = Attributes, TResult = unknown> =
    | FunctionHandler<TAttributes, TResult>
    | FunctionPlugin<TAttributes, TResult>;
export type FunctionExports<TExports extends Record<string, FunctionExport<any, any>>> = TExports;

export interface TransitionArgs {
    component: ComponentIdentity;
}

export type TransitionHandler = (args: TransitionArgs) => MaybePromise<TransitionKeyframes>;

/** @deprecated Export keyframes or a keyframe-producing function directly instead. */
export interface TransitionPlugin {
    keyframes: TransitionKeyframes;
    [key: string]: unknown;
}

export type TransitionExport = TransitionKeyframes | TransitionHandler | TransitionPlugin;
export type TransitionExports<TExports extends Record<string, TransitionExport>> = TExports;
