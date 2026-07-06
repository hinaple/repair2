import type { Action } from "svelte/action";

const outScrollAction: Action<HTMLElement, () => unknown> = (node, callback) => {
  const handleScroll = (e: WheelEvent) => {
    if (e.target && !node.contains(e.target as Node)) {
      callback();
    }
  };
  const opt = ["wheel", handleScroll, { capture: true, passive: true }] as const;
  document.addEventListener(...opt);
  return {
    destroy: () => document.removeEventListener(...opt)
  };
};

export default outScrollAction;
