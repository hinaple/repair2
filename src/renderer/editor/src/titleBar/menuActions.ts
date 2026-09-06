//"edit:undo" | "edit:redo" | "plugin:create-plugin" | "view:zoom-fit"

import { EditorMenuAction } from "@shared/editorMenu";
import { ipc } from "../lib/ipc";

const ActionHandlerMap = new Map<EditorMenuAction<"editor">, () => unknown>();

export function registerMenuAction(action: EditorMenuAction<"editor">, handler: () => unknown) {
  ActionHandlerMap.set(action, handler);

  return () => {
    if (ActionHandlerMap.get(action) === handler) ActionHandlerMap.delete(action);
  };
}

ipc.on("menu-action", (_evt, action) => {
  const handler = ActionHandlerMap.get(action);
  if (!handler) {
    console.error("Undefined Action To Editor:", action);
    return;
  }

  handler();
});

export function clickMenuButton(action: EditorMenuAction<"editor" | "main">) {
  const handler = ActionHandlerMap.get(action as EditorMenuAction<"editor">);
  if (!handler) ipc.send("editor-menu-action", action as EditorMenuAction<"main">);
  else handler();
}
