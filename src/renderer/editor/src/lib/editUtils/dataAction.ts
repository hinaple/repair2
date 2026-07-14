import { CONTEXT_FOCUS_TYPE_MAP } from "./clipboard/constants";
import { currentFocus, focusData, type FocusData } from "./focus";
import { get } from "svelte/store";
import { grabbing } from "../stores";
import { rightclick } from "./contextMenu/contextUtils";
import type { Action } from "svelte/action";
import type { ContextMenuParam } from "./contextMenu/types";

const focusTargets = new WeakMap<EventTarget, FocusData>();
const focusHandledEvents = new WeakSet<Event>();

window.addEventListener(
  "pointerdown",
  (evt) => {
    if (evt.button !== 0 || get(grabbing)) return;

    const focusTarget = evt.composedPath().find((target) => focusTargets.has(target));
    if (!focusTarget) return;

    const focussingData = focusTargets.get(focusTarget)!;
    focusHandledEvents.add(evt);
    focusData(focussingData.type, focussingData.target, focussingData.parents);
  },
  { capture: true }
);

export function isFocusHandled(evt: Event) {
  return focusHandledEvents.has(evt);
}

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

  focusTargets.set(focusNode, focussingData);

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
      focusTargets.delete(focusNode);
      unsub();
      if (focussing) focusData("project");
    }
  };
};
