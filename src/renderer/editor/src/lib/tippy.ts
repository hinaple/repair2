import type { Action } from "svelte/action";
import type { CreateSingletonProps } from "tippy.js";
import tippyjs, { createSingleton, type Props } from "tippy.js";

export type TippyActionParam = Partial<Props> | undefined;

export const tippy: Action<HTMLElement, TippyActionParam> = (node, opt) => {
  if (!opt) return;

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

export const tippySingleton: Action<HTMLElement, Partial<CreateSingletonProps>> = (node, opt) => {
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
