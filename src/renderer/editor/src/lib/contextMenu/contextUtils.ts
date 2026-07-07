import { get, writable, type Writable } from "svelte/store";
import { grabbing } from "../stores";
import { ContextMenus } from "./templates";
import type { Action } from "svelte/action";
import type { ContextMenu, ContextMenuParam } from "./types";

export const contextMenu: Writable<ContextMenu | undefined | null> = writable();

export default function showContextMenu(menu: ContextMenu) {
  contextMenu.set(menu);
}
function removeContextMenu() {
  contextMenu.set(null);
  clearContextMenuClass();
}
export function outClicked() {
  removeContextMenu();
}

let rightNode: HTMLElement | null;
function clearContextMenuClass() {
  if (rightNode) {
    rightNode.classList.remove("contextmenu");
    rightNode = null;
  }
}

export const rightclick: Action<HTMLElement, ContextMenuParam> = (node, p) => {
  node.addEventListener("contextmenu", (evt: MouseEvent) => {
    if (get(grabbing)) return;
    showContextMenu({
      ...p,
      pos: { x: evt.clientX, y: evt.clientY },
      items: ContextMenus[p.type]
    });
    evt.stopPropagation();
    clearContextMenuClass();
    rightNode = node;
    rightNode.classList.add("contextmenu");
  });
};
