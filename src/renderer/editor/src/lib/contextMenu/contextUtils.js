import { get, writable } from "svelte/store";
import { grabbing } from "../stores";

export const contextMenu = writable();

export default function showContextMenu({ pos, items }) {
    contextMenu.set({ pos, items });
}
function removeContextMenu() {
    contextMenu.set(null);
    clearContextMenuClass();
}
export function outClicked() {
    removeContextMenu();
}

let rightNode;
function clearContextMenuClass() {
    if (rightNode) {
        rightNode.classList.remove("contextmenu");
        rightNode = null;
    }
}
export function rightclick(node, items) {
    node.addEventListener("contextmenu", (evt) => {
        if (get(grabbing)) return;
        showContextMenu({ pos: { x: evt.clientX, y: evt.clientY }, items });
        evt.stopPropagation();
        clearContextMenuClass();
        rightNode = node;
        rightNode.classList.add("contextmenu");
    });
}
