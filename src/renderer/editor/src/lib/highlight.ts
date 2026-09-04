import type { Action } from "svelte/action";
import { get, writable } from "svelte/store";

export type HighlightType = "variable" | "plugin" | "resource";

const currentHighlights = writable<null | [HighlightType, string]>(null);

function activeHighlight(type: HighlightType, data: string) {
  currentHighlights.set([type, data]);
}
function deactiveHighlight(type: HighlightType) {
  currentHighlights.update((h) => (h && h[0] === type ? null : h));
}

export const hoverHighlight: Action<HTMLElement, { type: HighlightType; data: string }> = (
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
      if (hovering) activeHighlight(mine.type, mine.data);
    },
    destroy() {
      node.removeEventListener("mouseenter", mouseenter);
      node.removeEventListener("mouseleave", mouseleave);
    }
  };
};

export type HighlightData = { type: HighlightType; data: string } | undefined | null;
const registerHighlight: Action<HTMLElement, HighlightData> = (node, params) => {
  let on = false;

  function activate() {
    if (!params) return;
    node.classList.add("highlight");
    node.classList.add(`hl-${params.type}`);
  }
  function deactivate() {
    if (!params) return;
    node.classList.remove("highlight");
    node.classList.remove(`hl-${params.type}`);
  }

  function check(ch: [HighlightType, string] | null) {
    if (!params) return;

    if (on && (!ch || ch[0] !== params.type || ch[1] !== params.data)) {
      on = false;
      deactivate();
    } else if (!on && ch && ch[0] === params.type && ch[1] === params.data) {
      on = true;
      activate();
    }
  }
  const unsub = currentHighlights.subscribe(check);

  return {
    destroy() {
      unsub();
      if (on) deactivate();
    },
    update(newParams) {
      params = newParams;
      check(get(currentHighlights));
    }
  };
};

export default registerHighlight;
