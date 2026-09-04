import { get } from "svelte/store";
import { currentFocus } from "../focus";
import { paste } from "./paste";
import { copy } from "./copy";
import { removeData } from "./remove";
export type { PasteIdKey, PasteIdMap, PastePosition, PasteResult } from "./paste";
export * from "./paste";
export * from "./copy";
export * from "./remove";

export function cutData(target = get(currentFocus)) {
  copy(target);
  removeData(target);
}

function isTextInputTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
  );
}

function pasteHandler(e: ClipboardEvent) {
  if (isTextInputTarget(e.target)) return;

  paste();
}

function copyHandler(e: ClipboardEvent) {
  if (isTextInputTarget(e.target)) return;

  copy();
}
function cutHandler(e: ClipboardEvent) {
  if (isTextInputTarget(e.target)) return;

  cutData();
}
function keyDownHandler(e: KeyboardEvent) {
  if (e.key !== "Delete" || isTextInputTarget(e.target)) return;

  removeData();
}

window.addEventListener("paste", pasteHandler);
window.addEventListener("copy", copyHandler);
window.addEventListener("cut", cutHandler);
window.addEventListener("keydown", keyDownHandler);

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    window.removeEventListener("paste", pasteHandler);
    window.removeEventListener("copy", copyHandler);
    window.removeEventListener("cut", cutHandler);
    window.removeEventListener("keydown", keyDownHandler);
  });
}
