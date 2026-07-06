import type { Action } from "svelte/action";
import type { PointerEventHandler } from "svelte/elements";

const outClickAction: Action<
  HTMLElement,
  (() => unknown) | { callback: () => unknown; excludes: HTMLElement[] }
> = (node, arg) => {
  if (typeof arg === "function") arg = { callback: arg, excludes: [] };
  const { callback, excludes } = arg;

  const handleDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target && !node.contains(target) && !excludes.some((ex) => ex.contains(target))) {
      callback();
    }
  };
  document.addEventListener("pointerdown", handleDown);
  return {
    destroy: () => document.removeEventListener("pointerdown", handleDown)
  };
};

export default outClickAction;
