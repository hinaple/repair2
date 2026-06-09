import type { Action } from "svelte/action";
import tippyjs, { createSingleton, CreateSingletonProps, type Props } from "tippy.js";

export const tippy: Action<HTMLElement, Props> = (node: HTMLElement, opt: Props) => {
    const t = tippyjs(node, opt);

    return {
        update(props) {
            t.setProps(props);
        },
        destroy() {
            t.destroy();
        }
    };
};

export const tippySingleton: Action<HTMLElement, CreateSingletonProps> = (
    node: HTMLElement,
    opt: CreateSingletonProps
) => {
    const ts = tippyjs(node.querySelectorAll("[data-tippy-content]"));
    const singleton = createSingleton(ts, opt);

    return {
        update(props) {
            singleton.setProps(props);
        },
        destroy() {
            singleton.destroy();
            ts.forEach((t) => t.destroy());
        }
    };
};
