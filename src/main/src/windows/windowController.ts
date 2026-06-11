import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { createEditorMenu } from "./editorMenu";
import { checkVscodeInstalled } from "../system/vscodeUtils";
import type { MainApp } from "../app/mainApp";
import { logger } from "../logs/logger";

export class WindowController {
    #app: MainApp;

    constructor(app: MainApp) {
        this.#app = app;
    }

    createMainWindow() {
        const { controllers, globalKey, service, startup, state, system } = this.#app;
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

        ipcMain.once("play-win-ready", () => {
            startup.closeSplash();
            state.window.main?.show();

            controllers.project.applyDataConfig();
        });

        if (this.#app.isDev) {
            mainWindow.loadURL("http://localhost:3100");
        } else {
            mainWindow.loadFile(join(__dirname, "../play/index.html"));
        }

        mainWindow.on("closed", () => {
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
            }
        );
        mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
            if (level < 3) return;
            logger.error("Play renderer error", message + `\n\tat ${sourceId}:${line}`);
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
            show: false,
            webPreferences: {
                sandbox: false,
                nodeIntegration: true,
                contextIsolation: false,
                webSecurity: false
            }
        });
        state.window.editor = editorWindow;

        editorWindow.setMenu(createEditorMenu(this.#app));

        editorWindow.on("ready-to-show", () => {
            editorWindow.show();
            editorWindow.focus();
            if (state.project.data) {
                editorWindow.setAlwaysOnTop(
                    !!state.project.data?.config?.alwaysOnTop,
                    "screen-saver"
                );
            }
        });

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
            message.sendToPlay("monitor-event", "end");
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
