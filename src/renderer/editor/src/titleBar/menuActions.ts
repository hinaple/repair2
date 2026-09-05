//"edit:undo" | "edit:redo" | "plugin:create-plugin" | "view:zoom-fit"

import { EditorMenuAction } from "@shared/editorMenu";
import { ipc } from "../lib/ipc";

const ActionHandlerMap = new Map<EditorMenuAction, () => unknown>();

export function registerMenuAction(action: EditorMenuAction, handler: () => unknown) {
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

export function clickMenuButton(action: EditorMenuAction) {
  const handler = ActionHandlerMap.get(action);
  if (!handler) ipc.send("editor-menu-action", action);
  else handler();
}
