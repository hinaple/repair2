import { Menu, type MenuItemConstructorOptions } from "electron";
import type { MainApp } from "../app/mainApp";
import { fromEditorMenu, type EditorMenuAction } from "@shared/editorMenu";

export function createEditorMenu(app: MainApp) {
  function sendMenuAction(action: EditorMenuAction) {
    app.message.sendToEditor("menu-action", action);
  }

  const template: MenuItemConstructorOptions[] = fromEditorMenu(
    (item, action) =>
      item.type === "separator"
        ? item
        : {
            label: item.label,
            click: action
              ? action in app.editorAction
                ? app.editorAction[action as keyof typeof app.editorAction]
                : () => sendMenuAction(action)
              : undefined,
            accelerator: item.shortcut
              ? item.shortcut.replace(/Ctrl/g, "CommandOrControl")
              : undefined
          },
    (menu) => ({ label: menu.label, submenu: menu.items })
  );

  return Menu.buildFromTemplate(template);
}
