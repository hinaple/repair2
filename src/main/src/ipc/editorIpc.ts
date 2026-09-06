import type { MainApp } from "../app/mainApp";
import { logger } from "../logs/logger";
import { openVsCode } from "../system/externalTools";
import { ipc } from "./ipcMethods";

export function setupEditorIpc(app: MainApp) {
  ipc.on("editor-on", () => {
    const editorWindow = app.state.window.editor;
    if (!editorWindow) app.controllers.window.createEditorWindow();
    else editorWindow.focus();
  });

  ipc.on("unsaved", () => {
    const editorWindow = app.state.window.editor;
    if (!editorWindow) return;
    editorWindow.setTitle("Editor ●");
  });

  ipc.on("saved", () => {
    const editorWindow = app.state.window.editor;
    if (!editorWindow) return;
    editorWindow.setTitle("Editor");
  });

  ipc.handle("vscode:is-installed", () => app.state.externalTools.vscode);

  ipc.on("vscode:open", (_, src) => {
    openVsCode(src);
  });

  ipc.on("request-save:done", (_evt, { requestId, saved }) => {
    app.editorSave.resolveEditorSaveRequest(requestId, saved);
  });

  ipc.on("editor-menu-action", (_evt, action) => {
    if (!(action in app.editorAction)) {
      logger.error("Undefined Action In Main Process:", action);
      return;
    }
    app.editorAction[action as keyof typeof app.editorAction]();
  });
}
