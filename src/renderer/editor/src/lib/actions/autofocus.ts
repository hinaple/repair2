import type { Action } from "svelte/action";

export const autofocus: Action<HTMLElement, boolean | undefined> = (node, enabled) => {
  if (enabled) node.focus();
};
