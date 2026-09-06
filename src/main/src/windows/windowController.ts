import { BrowserWindow, ipcMain, type IpcMainEvent } from "electron";
import { join } from "path";
import { createEditorMenu } from "./editorMenu";
import { checkVscodeInstalled } from "../system/vscodeUtils";
import type { MainApp } from "../app/mainApp";
import { logger } from "../logs/logger";
import { ipc } from "../ipc/ipcMethods";

export class WindowController {
  #app: MainApp;

  constructor(app: MainApp) {
    this.#app = app;
  }

  createMainWindow() {
    const { controllers, globalKey, service, startup, state, system } = this.#app;
    let playRendererShown = false;
    let playRendererFailed = false;
    const quitOnStartupError = () => {
      if (playRendererShown || playRendererFailed) return;
      playRendererFailed = true;
      system.app.quit();
    };
    const mainWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false,
        backgroundThrottling: false
      },
      title: state.project.data?.config?.title ?? "REPAIRv2",
      frame: false,
      transparent: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      movable: false
    });
    state.window.main = mainWindow;
    mainWindow.setMenu(null);

    const onPlayWindowReady = (event: IpcMainEvent) => {
      if (event.sender !== mainWindow.webContents) return;
      ipc.off("play-win-ready", onPlayWindowReady);
      playRendererShown = true;
      startup.closeSplash();
      mainWindow.show();

      controllers.project.applyDataConfig();
    };
    ipc.on("play-win-ready", onPlayWindowReady);

    if (this.#app.isDev) {
      mainWindow.loadURL("http://localhost:3100");
    } else {
      mainWindow.loadFile(join(__dirname, "../play/index.html"));
    }

    mainWindow.on("closed", () => {
      ipcMain.removeListener("play-win-ready", onPlayWindowReady);
      state.window.main = null;
      globalKey.stopSuppress();
      if (!service.projectFileManager.importing) {
        startup.closeSplash();
        system.app.quit();
      }
    });
    mainWindow.on("focus", () => {
      if (state.project.data?.config?.suppressGlobalKeys) globalKey.startSuppress();
    });
    mainWindow.on("blur", () => {
      globalKey.stopSuppress();
    });

    mainWindow.webContents.on("render-process-gone", (evt, details) => {
      logger.error("[Play renderer gone]", details.reason);
      quitOnStartupError();
    });
    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL) => {
        logger.error(
          "Play load failed",
          JSON.stringify(
            {
              errorCode,
              errorDescription,
              validatedURL
            },
            null,
            4
          )
        );
        quitOnStartupError();
      }
    );
    mainWindow.webContents.on("console-message", ({ level, message, lineNumber, sourceId }) => {
      if (level !== "error") return;
      logger.error("Play renderer error", message + `\n\tat ${sourceId}:${lineNumber}`);
      quitOnStartupError();
    });
  }

  createEditorWindow() {
    const { state, editorSave, message, system } = this.#app;
    if (state.window.editor) return;

    if (state.device.isVscodeInstalled === null) {
      checkVscodeInstalled().then((r) => (state.device.isVscodeInstalled = r));
    }

    const editorWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 750,
      minHeight: 500,
      show: false,
      webPreferences: {
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false
      },
      titleBarStyle: "hidden",
      titleBarOverlay: {
        color: "#1b1c1d",
        symbolColor: "rgba(255, 255, 255, 0.6)",
        height: 36
      }
    });
    state.window.editor = editorWindow;

    editorWindow.setMenu(createEditorMenu(this.#app));
    editorWindow.setMenuBarVisibility(false);

    function showEditorWin(evt: IpcMainEvent) {
      if (evt.sender !== editorWindow.webContents) return;

      ipc.off("editor-win-ready", showEditorWin);

      editorWindow.show();
      editorWindow.focus();
      if (state.project.data) {
        editorWindow.setAlwaysOnTop(!!state.project.data?.config?.alwaysOnTop, "screen-saver");
      }
    }
    ipc.on("editor-win-ready", showEditorWin);

    editorWindow.webContents.setWindowOpenHandler((details) => {
      system.shell.openExternal(details.url);
      return { action: "deny" };
    });

    if (this.#app.isDev) {
      editorWindow.loadURL("http://localhost:3101");
    } else {
      editorWindow.loadFile(join(__dirname, "../editor/index.html"));
    }

    editorWindow.on("close", () => {
      if (editorSave.pending) {
        editorSave.resolveEditorSaveRequest(editorSave.pending.requestId, false);
      }
      state.window.editor = null;
    });
  }

  closeProjectWindows() {
    const { state } = this.#app;
    if (state.window.editor) {
      state.window.editor.close();
      state.window.editor = null;
    }
    if (state.window.main) {
      state.window.main.close();
      state.window.main = null;
    }
  }
}
