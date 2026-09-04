import { get } from "svelte/store";
import { hoverInput } from "./output";
import type { Action } from "svelte/action";

const inputNode: Action<HTMLElement, { id: string; hasInput?: boolean }> = (
  node,
  { id, hasInput = true }
) => {
  if (!id) return;
  let hasInputNow = hasInput;
  node.addEventListener("mouseenter", () => {
    if (!hasInputNow) return;
    hoverInput.set(id);
  });
  node.addEventListener("mouseleave", () => {
    if (!hasInputNow) return;
    if (get(hoverInput) === id) hoverInput.set(null);
  });
  return {
    update({ hasInput }) {
      if (hasInput) hasInputNow = hasInput;
    }
  };
};

export default inputNode;
