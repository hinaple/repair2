import type { EditorMenuAction } from "@shared/editorMenu";
import type { MainApp } from "./mainApp";
import type { BrowserWindow } from "electron";

function toggleDevtool(window: BrowserWindow | null, title: string) {
  if (!window) return;

  if (window.webContents.isDevToolsFocused()) {
    window.webContents.closeDevTools();
    return;
  }
  window.webContents.openDevTools({
    mode: "detach",
    title
  });
}

export function createEditorAction(app: MainApp) {
  return {
    "file:new-project": async () => {
      const { response } = await app.system.dialog.showMessageBox({
        type: "info",
        title: "프로젝트 내보내기",
        message: "현재 편집 중인 프로젝트 정보가 삭제됩니다.",
        detail: "현재 프로젝트를 먼저 내보낼까요?",
        buttons: ["내보내기", "내보내지 않음", "취소"],
        defaultId: 0,
        cancelId: 2,
        noLink: true
      });

      if (response === 2) return;
      if (
        response === 0 &&
        !(await app.service.projectFileManager.exportProject(
          app.controllers.project.getProjectExportName()
        ))
      )
        return;

      await app.service.projectFileManager.importProject(app.paths.emptyProjectFile);
    },
    "file:save": async () => {
      await app.editorSave.requestEditorSave();
    },
    "file:import-project": async () => {
      if (!(await app.service.projectFileManager.selectImportProject())) return;
      app.controllers.window.createEditorWindow();
    },
    "file:export-project": async () => {
      if (!(await app.editorSave.requestEditorSave())) return;
      await app.service.projectFileManager.exportProject(
        app.controllers.project.getProjectExportName()
      );
    },
    "file:open-data-folder": () => app.system.shell.openPath(app.paths.dataDir),
    "file:quit": () => app.system.app.quit(),

    "tools:toggle-editor-devtools": () => toggleDevtool(app.state.window.editor, "편집기 콘솔"),
    "tools:toggle-player-devtools": () => toggleDevtool(app.state.window.main, "플레이 콘솔"),

    "plugin:rebuild-all-plugins": async () => {
      if (!app.service.pluginManager) return;
      await app.service.pluginManager.updateAllPluginInfo({
        forceBuild: true,
        forceDependencies: true
      });
    },

    "view:reload-editor": () => app.state.window.editor?.webContents.reloadIgnoringCache(),
    "view:reload-play": () => app.state.window.main?.webContents.reloadIgnoringCache()
  } satisfies Record<EditorMenuAction<"main">, () => unknown>;
}
