import type { Action } from "svelte/action";

export const autofocus: Action = (node) => {
  node.focus();
};
