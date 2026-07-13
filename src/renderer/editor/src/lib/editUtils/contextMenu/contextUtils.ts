import { get, writable, type Writable } from "svelte/store";
import { grabbing } from "../../stores";
import { ContextMenus } from "./templates";
import type { Action } from "svelte/action";
import type { ContextMenu, ContextMenuItem, ContextMenuItems, ContextMenuParam } from "./types";
import { copy, cutData, paste, removeData } from "../clipboard";
import { CONTEXT_FOCUS_TYPE_MAP } from "../clipboard/constants";
import type { FocusData } from "../focus";

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

function itemClickResult(menu: ContextMenu, item: Exclude<ContextMenuItem, { type: "separator" }>) {
  if (!item.role) return item.click?.(menu);

  if (item.role === "paste") paste(menu.focusData, menu.pos);
  if (item.role === "copy") copy(menu.focusData);
  if (item.role === "cut") cutData(menu.focusData);
  if (item.role === "remove") removeData(menu.focusData);

  item.click?.(menu);
  return true;
}

export function itemClicked(
  menu: ContextMenu,
  item: Exclude<ContextMenuItem, { type: "separator" }>
) {
  if (itemClickResult(menu, item)) outClicked();
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
      items: ContextMenus[p.type],
      focusData: {
        type: CONTEXT_FOCUS_TYPE_MAP[p.type],
        target: p.id ?? null,
        parents: p.parents
      } as Exclude<FocusData, { type: "nodes" }>
    });
    evt.stopPropagation();
    clearContextMenuClass();
    rightNode = node;
    rightNode.classList.add("contextmenu");
  });
};
