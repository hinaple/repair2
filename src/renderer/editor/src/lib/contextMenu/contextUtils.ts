import { get, writable, type Writable } from "svelte/store";
import { grabbing } from "../stores";
import type { Action } from "svelte/action";

type ContextMenuItems = (
  | { type: "separator" }
  | {
      type?: "button";
      click(menuInfo: ContextMenu): boolean | undefined;
      label: string;
    }
)[];
interface ContextMenu {
  pos: { x: number; y: number };
  items: ContextMenuItems;
}
export const contextMenu: Writable<ContextMenu | undefined | null> = writable();

export default function showContextMenu({ pos, items }: ContextMenu) {
  contextMenu.set({ pos, items });
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
export const rightclick: Action<HTMLElement, ContextMenuItems> = (node, items) => {
  node.addEventListener("contextmenu", (evt: MouseEvent) => {
    if (get(grabbing)) return;
    showContextMenu({ pos: { x: evt.clientX, y: evt.clientY }, items });
    evt.stopPropagation();
    clearContextMenuClass();
    rightNode = node;
    rightNode.classList.add("contextmenu");
  });
};
