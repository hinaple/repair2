import { CONTEXT_FOCUS_TYPE_MAP } from "./clipboard/constants";
import { currentFocus, focusData, type FocusData } from "./focus";
import { get } from "svelte/store";
import { grabbing } from "../stores";
import { rightclick } from "./contextMenu/contextUtils";
import type { Action } from "svelte/action";
import type { ContextMenuParam } from "./contextMenu/types";

export const data: Action<HTMLElement, ContextMenuParam> = (node, p) => {
  const contextNode = node.querySelector<HTMLElement>("[data-contextmenu]") || node;
  const focusNode = node.querySelector<HTMLElement>("[data-focus]") || node;

  rightclick(contextNode, p);

  const focusType = CONTEXT_FOCUS_TYPE_MAP[p.type];

  const focussingData = {
    type: focusType,
    target: p.id ?? null,
    parents: p.parents
  } as FocusData;

  focusNode.addEventListener("pointerdown", (evt: PointerEvent) => {
    if (evt.button !== 0 || get(grabbing)) return;
    evt.stopPropagation();

    focusData(focussingData.type, focussingData.target, focussingData.parents);
  });

  let focussing = false;
  const unsub = currentFocus.subscribe((cf) => {
    if (focussing === (cf.type === focussingData.type && cf.target === focussingData.target))
      return;

    focussing = !focussing;

    if (focussing) focusNode.classList.add("focus");
    else focusNode.classList.remove("focus");
  });

  return {
    destroy() {
      unsub();
      if (focussing) focusData("project");
    }
  };
};
