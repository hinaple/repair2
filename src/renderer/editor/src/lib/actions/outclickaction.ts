import type { Action } from "svelte/action";

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

  const controller = new AbortController();
  document.addEventListener("pointerdown", handleDown, {
    capture: true,
    passive: true,
    signal: controller.signal
  });
  return {
    destroy: () => controller.abort()
  };
};

export default outClickAction;
