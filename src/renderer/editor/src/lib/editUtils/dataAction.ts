import { currentFocus, focusData, type FocusData } from "./focus";
import { get } from "svelte/store";
import { grabbing } from "../stores";
import { createContextFocusData, rightclick } from "./contextMenu/contextUtils";
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
    focusData(focussingData.type, focussingData.target, focussingData.parents, evt.shiftKey);
  },
  { capture: true }
);

export function isFocusHandled(evt: Event) {
  return focusHandledEvents.has(evt);
}

export const data: Action<HTMLElement, ContextMenuParam> = (node, p) => {
  const contextNode = node.querySelector<HTMLElement>("[data-contextmenu]") || node;
  const focusNode = node.querySelector<HTMLElement>("[data-focus]") || node;

  const contextMenuAction = rightclick(contextNode, p);

  let focussingData = createContextFocusData(p);

  focusTargets.set(focusNode, focussingData);

  let focussing = false;
  function syncFocusClass(current: FocusData) {
    const nextFocussing =
      current.type === focussingData.type && current.target === focussingData.target;
    if (focussing === nextFocussing) return;

    focussing = nextFocussing;
    focusNode.classList.toggle("focus", focussing);
  }

  const unsub = currentFocus.subscribe(syncFocusClass);

  return {
    update(nextParam) {
      contextMenuAction?.update?.(nextParam);
      focussingData = createContextFocusData(nextParam);
      focusTargets.set(focusNode, focussingData);
      syncFocusClass(get(currentFocus));
    },
    destroy() {
      contextMenuAction?.destroy?.();
      focusTargets.delete(focusNode);
      unsub();
      if (focussing) focusData("project");
    }
  };
};
