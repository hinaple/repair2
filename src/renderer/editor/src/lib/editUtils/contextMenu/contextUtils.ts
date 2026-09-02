import { get, writable, type Writable } from "svelte/store";
import { grabbing } from "../../stores";
import { createContextMenuItems } from "./templates";
import type { Action } from "svelte/action";
import type { ContextMenu, ContextMenuContext, ContextMenuParam } from "./types";
import { CONTEXT_FOCUS_TYPE_MAP } from "../clipboard/constants";
import type { FocusData } from "../focus";

export const contextMenu: Writable<ContextMenu | null> = writable(null);

export function createContextFocusData(
  param: ContextMenuParam
): Exclude<FocusData, { type: "nodes" }> {
  return {
    type: CONTEXT_FOCUS_TYPE_MAP[param.type],
    target: param.id ?? null,
    parents: param.parents
  } as Exclude<FocusData, { type: "nodes" }>;
}

let rightNode: HTMLElement | null = null;

function clearContextMenuClass() {
  rightNode?.classList.remove("contextmenu");
  rightNode = null;
}

function showContextMenu(menu: ContextMenu, source: HTMLElement) {
  clearContextMenuClass();
  rightNode = source;
  rightNode.classList.add("contextmenu");
  contextMenu.set(menu);
}

export function closeContextMenu() {
  contextMenu.set(null);
  clearContextMenuClass();
}

export const rightclick: Action<HTMLElement, ContextMenuParam> = (node, p) => {
  let param = p;

  const oncontextmenu = (evt: MouseEvent) => {
    if (get(grabbing)) return;

    const position = { x: evt.clientX, y: evt.clientY };
    const context: ContextMenuContext = {
      ...param,
      position,
      focusData: createContextFocusData(param)
    };

    showContextMenu({ position, items: createContextMenuItems(context) }, node);
    evt.preventDefault();
    evt.stopPropagation();
  };

  node.addEventListener("contextmenu", oncontextmenu);

  return {
    update(nextParam) {
      param = nextParam;
    },
    destroy() {
      node.removeEventListener("contextmenu", oncontextmenu);
      if (rightNode === node) closeContextMenu();
    }
  };
};
