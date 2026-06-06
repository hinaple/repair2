import { app, shell, dialog, ipcMain } from "electron";
import { join } from "path";
import { electronApp, is } from "@electron-toolkit/utils";

import { afterSplashClose, closeSplash, sendStartupInfo, showSplash } from "./splash";
import { setupIpcHandlers } from "./ipc";
import { setGlobalKeyListener, startSuppress, stopSuppress } from "./globalKey";
import makeLogFile from "./logs/logFile";
import { createLogReporter } from "./logs/reportLog";
import { setSendToWin } from "./plugin/runtimeMain";
import { dataDir, assetDir, pluginDir, styleDir, templateDir } from "./dirs";
import { clearStore, getStore } from "./electronStore";
import { PluginHmrController } from "./controllers/pluginHmrController";
import { ProjectController } from "./controllers/projectController";
import { ServiceInitializer } from "./app/serviceInitializer";
import { WindowController } from "./windows/windows";
import { createControllerRegistry } from "./app/controllerRegistry";
import { createServiceRegistry } from "./app/serviceRegistry";
import type { MainContext, MainState } from "./app/mainContext.types";

declare const __APP_VERSION__: string;

//#region runtime state
const state: MainState = {
    project: {
        data: null,
        cssCode: ""
    },
    window: {
        main: null,
        editor: null
    },
    hmr: {
        setter: null,
        importing: null,
        isActive: false
    },
    device: {
        isVscodeInstalled: null
    },
    editorSave: {
        nextRequestId: 1,
        pending: null
    }
};

const service = createServiceRegistry();

const paths = {
    assetDir,
    dataDir,
    defaultProjectFile: join(templateDir, "projects/default.repair"),
    emptyProjectFile: join(templateDir, "projects/empty.repair")
};

const system = {
    app,
    dialog,
    shell
};

let mainContext: MainContext;
const controllers = createControllerRegistry();
//#endregion

//#region app context
function sendToMain(channel: string, ...params: unknown[]) {
    if (state.window.main) state.window.main.webContents.send(channel, ...params);
}
setSendToWin(sendToMain);

function sendToEditor(channel: string, ...params: unknown[]) {
    if (state.window.editor) state.window.editor.webContents.send(channel, ...params);
}

const reportLog = createLogReporter({
    makeLogFile,
    getEditorWindow: () => state.window.editor,
    getMainWindow: () => state.window.main,
    dialog
});

function createMainContext(): MainContext {
    return {
        state,
        service,
        controllers,
        editorSave: {
            requestEditorSave,
            resolveEditorSaveRequest
        },
        message: {
            sendToMain,
            sendToEditor
        },
        log: {
            reportLog
        },
        paths,
        store: {
            getStore
        },
        system
    };
}
//#endregion

//#region editor save workflow
function resolveEditorSaveRequest(requestId: number, saved: boolean) {
    const pending = state.editorSave.pending;
    if (!pending || pending.requestId !== requestId) return;
    clearTimeout(pending.timeoutId);
    state.editorSave.pending = null;
    pending.resolve(!!saved);
}

function requestEditorSave() {
    if (!state.window.editor || state.window.editor.isDestroyed?.()) return Promise.resolve(false);
    if (state.editorSave.pending) return state.editorSave.pending.promise;

    const requestId = state.editorSave.nextRequestId++;
    let resolve!: (saved: boolean) => void;
    const promise = new Promise<boolean>((res) => {
        resolve = res;
    });
    const timeoutId = setTimeout(() => {
        resolveEditorSaveRequest(requestId, false);
    }, 15000);

    state.editorSave.pending = {
        requestId,
        promise,
        resolve,
        timeoutId
    };
    sendToEditor("request-save", { requestId });
    return promise;
}

function registerEditorSaveIpc() {
    ipcMain.on("request-save:done", (_evt, { requestId, saved }) => {
        resolveEditorSaveRequest(requestId, saved);
    });
}
//#endregion

//#region app lifecycle
async function appOpenedWithProject(argv: string[], appWasRunning = true) {
    if (argv.length < 2) return false;

    const filePath = argv.find((arg) => arg.endsWith(".repair"));
    if (!filePath) return false;

    const confirm = await dialog.showMessageBox({
        type: "info",
        title: "프로젝트 불러오기",
        message: "프로젝트를 불러올까요?",
        detail: "기존에 편집 중이던 프로젝트의 정보가 삭제됩니다.",
        buttons: ["확인", "취소"],
        cancelId: 1,
        defaultId: 0,
        noLink: true
    });
    if (confirm.response !== 0) {
        if (!appWasRunning) app.quit();
        return false;
    }
    await service.projectFileManager.importProject(filePath);

    return true;
}

function registerAppLifecycle() {
    if (!app.requestSingleInstanceLock()) {
        app.quit();
        return;
    }

    app.on("second-instance", async (_event, argv) => {
        if (!state.window.main) return;

        await appOpenedWithProject(argv, true);
    });

    app.on("ready", async () => {
        electronApp.setAppUserModelId("com.repair2");

        setupIpcHandlers(mainContext);

        if (!(await appOpenedWithProject(process.argv, false))) {
            showSplash(is.dev, __APP_VERSION__);
            await Promise.all([
                new Promise((res) => setTimeout(res, 3000)),
                controllers.project.loadData()
            ]);
        }

        if (is.dev) {
            controllers.window.createMainWindow();
            controllers.window.createEditorWindow();
        } else {
            controllers.window.createMainWindow();
        }
    });
}

function bootstrap() {
    mainContext = createMainContext();
    controllers.set(
        "pluginHmr",
        new PluginHmrController({
            context: mainContext,
            dirs: {
                dataDir,
                pluginDir,
                styleDir
            },
            reportLog
        })
    );
    controllers.set(
        "project",
        new ProjectController({
            context: mainContext,
            appVersion: __APP_VERSION__,
            pluginDir,
            reportLog,
            sendStartupInfo,
            afterSplashClose
        })
    );
    controllers.set(
        "window",
        new WindowController({
            context: mainContext,
            isDev: is.dev,
            closeSplash,
            startSuppress,
            stopSuppress
        })
    );
    controllers.set(
        "serviceInitializer",
        new ServiceInitializer({
            context: mainContext,
            isDev: is.dev,
            appVersion: __APP_VERSION__,
            clearStore,
            reportLog,
            sendStartupInfo,
            showSplash,
            setGlobalKeyListener
        })
    );
    controllers.serviceInitializer.initializeServices();
    registerEditorSaveIpc();
    registerAppLifecycle();

    app.on("window-all-closed", () => {
        app.quit();
    });
}

bootstrap();
//#endregion
