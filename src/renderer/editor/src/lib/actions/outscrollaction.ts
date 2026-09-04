import type { Action } from "svelte/action";

const outScrollAction: Action<HTMLElement, () => unknown> = (node, callback) => {
  const handleScroll = (e: WheelEvent) => {
    if (e.target && !node.contains(e.target as Node)) {
      callback();
    }
  };
  const controller = new AbortController();
  document.addEventListener("wheel", handleScroll, {
    capture: true,
    passive: true,
    signal: controller.signal
  });
  return {
    destroy: () => controller.abort()
  };
};

export default outScrollAction;
