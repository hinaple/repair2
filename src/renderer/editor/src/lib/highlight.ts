import type { Action } from "svelte/action";
import FrameUpdater from "./frameUpdater";

export type HightlightType = "variable" | "plugin" | "resource";

interface Highlight {
  node: HTMLElement;
  type: HightlightType;
  data: string;
  active: boolean;
}
const highlights: Set<Highlight> = new Set();
const currentHighlights: Map<HightlightType, string> = new Map();

const FU = new FrameUpdater(() => {
  highlights.forEach((h) => {
    if (h.active && currentHighlights.get(h.type) === h.data) {
      h.node.classList.add("highlight");
      h.node.classList.add(`hl-${h.type}`);
    } else {
      h.node.classList.remove("highlight");
      h.node.classList.remove(`hl-${h.type}`);
    }
  });
});
function activeHighlight(type: HightlightType, data: string) {
  currentHighlights.set(type, data);
  FU.draw();
}
function deactiveHighlight(type: HightlightType) {
  currentHighlights.delete(type);
  FU.draw();
}

export const hoverHighlight: Action<HTMLElement, { type: HightlightType; data: string }> = (
  node,
  { type, data }
) => {
  const mine = { type, data };
  let hovering = false;
  let mouseenter = () => {
    hovering = true;
    activeHighlight(mine.type, mine.data);
  };
  let mouseleave = () => {
    hovering = false;
    deactiveHighlight(mine.type);
  };
  node.addEventListener("mouseenter", mouseenter);
  node.addEventListener("mouseleave", mouseleave);
  return {
    update({ type, data }) {
      if (hovering) deactiveHighlight(mine.type);
      mine.type = type;
      mine.data = data;
      if (hovering) {
        activeHighlight(mine.type, mine.data);
        FU.draw();
      }
    },
    destroy() {
      node.removeEventListener("mouseenter", mouseenter);
      node.removeEventListener("mouseleave", mouseleave);
    }
  };
};

const registerHighlight: Action<
  HTMLElement,
  { type: HightlightType; data: string; active?: boolean }
> = (node, { type, data, active = false }) => {
  const mine = { node, type, data, active };
  highlights.add(mine);
  FU.draw();
  return {
    destroy() {
      highlights.delete(mine);
      FU.draw();
    },
    update({ type, data, active }) {
      mine.type = type;
      mine.data = data;
      mine.active = !!active;
      FU.draw();
    }
  };
};

export default registerHighlight;
