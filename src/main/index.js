import { app, shell, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import { join } from "path";
import { electronApp, is } from "@electron-toolkit/utils";
import fs, { readdir } from "fs/promises";
import Store from "electron-store";

import SerialConnector from "./communication/serial";
import SocketConnector from "./communication/socket";
import ProjectFileManager from "./projectFileManager";
import { getFullScreenArea, getPrimaryScreenArea, getWindowArea } from "./screenManager";
import { checkVscodeInstalled } from "./vscodeUtils.js";
import { afterSplashClose, closeSplash, sendStartupInfo, showSplash } from "./splash.js";
import { findService } from "./communication/bonjour.js";
import { setupIpcHandlers } from "./ipcHandlers.js";
import {
    getIsSuppressing,
    setGlobalKeyListener,
    startSuppress,
    stopSuppress
} from "./globalKey.js";
import makeLog from "./logger.js";
import { createDiagnosticReporter } from "./diagnostics.js";
import { PluginManager } from "./plugin/pluginManager.js";
import { migrateProject } from "./migrateProject.js";
import { setSendToWin } from "./plugin/runtimeMain.js";
import { dataDir, assetDir, pluginDir, styleDir, templateDir } from "./dirs.js";
import { createHmr } from "./hmrs.js";

/**
 * @type {BrowserWindow | null}
 */
let mainWindow;
/**
 * @type {BrowserWindow | null}
 */
let editorWindow;
/** @type {PluginManager} */
let pluginManager;

let data;

const emptySveltePluginDir = join(templateDir, "empty-svelte-plugin");

function sendToMain(channel, ...params) {
    if (mainWindow) mainWindow.webContents.send(channel, ...params);
}
setSendToWin(sendToMain);
function sendToEditor(channel, ...params) {
    if (editorWindow) editorWindow.webContents.send(channel, ...params);
}

const reportDiagnostic = createDiagnosticReporter({
    makeLog,
    sendToEditor,
    getEditorWindow: () => editorWindow,
    getMainWindow: () => mainWindow,
    dialog
});

let cssCode = "";
async function updateCss() {
    try {
        cssCode = String(await fs.readFile(join(styleDir, "global.css"))).replace(
            /%FONTS%/g,
            join(styleDir, "fonts").replace(/\\/g, "/")
        );
    } catch (err) {
        reportDiagnostic({
            level: "error",
            title: "Failed to load global.css file",
            error: err,
            source: "style",
            dialogue: false,
            logType: "global-css"
        });
    }
    return cssCode;
}

const hmr = createHmr({
    onHmr({ type, data }) {
        if (type === "css") {
            updateCss().then((css) => sendToMain("global-css", css));
            return;
        }

        if (!pluginManager) return;
        if (data) pluginManager.updatePlugin(data, true);
        else pluginManager.updateAllPluginInfo(false);
    },
    active: false,
    styleDir,
    pluginDir,
    dataDir
});
async function setPluginManager(isDev = false) {
    if (pluginManager) await destroyPluginManager();
    pluginManager = new PluginManager({
        isDev,
        reportDiagnostic,
        onupdate: ({ type, updateData }) => {
            if (type === "single") {
                sendToEditor("plugin:update", updateData);
                sendToMain("plugin:update", updateData);
                return;
            }
            const pluginList = pluginManager.simplePluginList;
            sendToEditor("plugin:list", pluginList);
            sendToMain("plugin:list", pluginList, updateData.buildChanges);
        },
        onhmr: (pluginInfo) => {
            sendToMain("plugin-hmr", pluginInfo);
        }
    });
    return pluginManager.initialize();
}
async function destroyPluginManager() {
    if (!pluginManager) return;

    const tempPM = pluginManager;
    pluginManager = null;
    return await tempPM.destroy();
}

const projectFileManager = new ProjectFileManager(dataDir, {
    beforeImport: () => {
        console.log("IMPORT STARTED NOW");
        showSplash(is.dev);
        if (editorWindow) {
            editorWindow.close();
            editorWindow = null;
        }
        if (mainWindow) {
            mainWindow.close();
            mainWindow = null;
        }
        return Promise.all([hmr.stopWatching(), destroyPluginManager()]);
    },
    importProgress: sendStartupInfo,
    afterImport: async () => {
        console.log("IMPORTING DONE");
        await loadData();
        if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
        else createMainWindow();

        store.clear();
    },
    exportProgress: (progress) => {
        sendToEditor("exporting", progress);
    },
    afterExport: (filePath) => {
        sendToEditor("exported", filePath);
    },
    reportDiagnostic
});

const socket = new SocketConnector((channel, data, url) => {
    if (!mainWindow) return;

    console.log("SOCKET INCOMING:", channel);

    sendToEditor("socket-income", channel, data, url);
    sendToMain("socket-income", channel, data);
});

const serial = new SerialConnector(
    (data) => {
        if (!mainWindow) return;

        console.log("SERIAL INCOMING:", data);

        sendToEditor("serial-income", data);
        sendToMain("serial-income", data);
    },
    (port) => {
        sendToEditor("serial-connected", port);
    }
);

setGlobalKeyListener((type, evt) => {
    if (mainWindow?.isFocused?.()) sendToMain("global-key-event", type, evt);
});

const pluginSdkPackageDir = join(app.getPath("userData"), "sdk", "repair2-plugin-sdk");

function saveData(tempData) {
    data = { ...tempData, updatedAt: new Date().getTime() };
    applyDataConfig();
    return fs
        .writeFile(join(dataDir, "data.json"), JSON.stringify(data))
        .then(() => {
            consumeAfterSave();
            return true;
        })
        .catch(async (e) => {
            afterSave = null;
            await reportDiagnostic({
                level: "error",
                title: "프로젝트 저장 실패",
                detail: "프로젝트 데이터를 저장하는 중 오류가 발생했습니다.",
                error: e,
                source: "project",
                dialogue: true,
                logType: "project-save-error"
            });
            return false;
        });
}

function importDefaultProject() {
    sendStartupInfo("기본 프로젝트 로드 중...");
    return projectFileManager.importProject(join(templateDir, "projects/default.repair"));
}

async function loadData() {
    sendStartupInfo("데이터 파일 로드 중...");
    try {
        await fs.access(dataDir);
        const tempData = (await fs.readFile(join(dataDir, "data.json"))).toString();
        data = JSON.parse(tempData);
    } catch (err) {
        return await importDefaultProject();
    }

    sendStartupInfo("프로젝트 버전 처리 중...");
    if (
        await migrateProject({
            currentVersion: __APP_VERSION__,
            data,
            dataDir,
            pluginDir
        })
    ) {
        afterSplashClose(() =>
            dialog.showMessageBox(editorWindow || mainWindow, {
                message: "구버전 프로젝트",
                detail: "호환되지 않는 기능이 포함된 버전의 프로젝트입니다. 일부 데이터에 손실이 있을 수 있습니다.",
                type: "warning",
                noLink: true
            })
        );
    }
    sendStartupInfo("플러그인 처리 중...");
    await Promise.all([setPluginManager(!!data.config?.devMode), updateCss()]);
    applyDataConfig();

    sendStartupInfo("Repair2 실행 중...");
    return true;
}

let isMultiScreen = null;
function applyDataConfig(forceUpdate = false) {
    if (!data?.config) return;

    const devMode = !!data.config?.devMode;
    hmr.setActive(devMode);
    if (pluginManager) pluginManager.isDev = !!data.config?.devMode;

    if (!mainWindow) return;

    mainWindow.setAlwaysOnTop(!!data.config?.alwaysOnTop, "screen-saver");
    if (editorWindow) editorWindow.setAlwaysOnTop(!!data.config?.alwaysOnTop, "screen-saver");
    mainWindow.setTitle?.(data.config?.title ?? "REPAIRv2");

    if (!data.config.screenConfig && data.config.multiScreen !== undefined) {
        isMultiScreen = data.config.multiScreen;

        const area = isMultiScreen ? getFullScreenArea() : getPrimaryScreenArea();

        mainWindow.setBounds?.(area);
        return;
    }

    const currentIsMultiscreen =
        (data.config.screenConfig?.type[0] ?? "fullscreen") !== "fullscreen";
    if (!data.config.screenConfig) return;
    isMultiScreen = currentIsMultiscreen;
    if (isMultiScreen) app.commandLine.appendSwitch("disable-gpu-compositing");
    else app.commandLine.removeSwitch("disable-gpu-compositing");

    mainWindow.setBounds?.(getWindowArea(data.config));
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            backgroundThrottling: false
        },
        title: data?.config?.title ?? "REPAIRv2",
        frame: false,
        transparent: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        movable: false
    });
    mainWindow.setMenu(null);

    ipcMain.once("play-win-ready", () => {
        closeSplash();
        mainWindow.show();
        mainWindow.focus();

        applyDataConfig(true);
    });

    if (is.dev) {
        mainWindow.loadURL("http://localhost:3100");
    } else {
        mainWindow.loadFile(join(__dirname, "../play/index.html"));
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
        stopSuppress();
        if (!projectFileManager.importing) {
            closeSplash();
            app.quit();
        }
    });
    mainWindow.on("focus", () => {
        if (data?.config?.suppressGlobalKeys) startSuppress();
    });
    mainWindow.on("blur", () => {
        stopSuppress();
    });
}

let afterSave;
function consumeAfterSave() {
    afterSave?.();
    afterSave = null;
}

let isEditorOn = false;
let isVscodeInstalled = null;
function createEditorWindow() {
    if (isEditorOn) return;

    if (isVscodeInstalled === null) checkVscodeInstalled().then((r) => (isVscodeInstalled = r));
    isEditorOn = true;

    editorWindow = new BrowserWindow({
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

    const template = [
        {
            label: "파일",
            submenu: [
                {
                    label: "새 프로젝트",
                    click: async () => {
                        const { response } = await dialog.showMessageBox(editorWindow, {
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
                            !(await projectFileManager.exportProject(
                                (data?.config?.title ?? "REPAIRv2").replace(/\s/g, "_")
                            ))
                        )
                            return;

                        await projectFileManager.importProject(
                            join(templateDir, "projects/empty.repair")
                        );
                    },
                    accelerator: "CommandOrControl+N"
                },
                { type: "separator" },
                {
                    label: "저장",
                    click: () => {
                        sendToEditor("request-save");
                    },
                    accelerator: "CommandOrControl+S"
                },
                { type: "separator" },
                {
                    label: "프로젝트 불러오기",
                    click: async () => {
                        if (!(await projectFileManager.selectImportProject())) return;
                        createEditorWindow();
                    },
                    accelerator: "CommandOrControl+Shift+O"
                },
                {
                    label: "프로젝트 내보내기",
                    click: async () => {
                        sendToEditor("request-save");
                        afterSave = () =>
                            projectFileManager.exportProject(
                                (data?.config?.title ?? "REPAIRv2").replace(/\s/g, "_")
                            );
                    },
                    accelerator: "CommandOrControl+Shift+S"
                },
                { type: "separator" },
                {
                    label: "데이터 폴더 열기",
                    click: () => {
                        shell.openPath(dataDir);
                    }
                }
            ]
        },
        {
            label: "편집",
            submenu: [
                {
                    label: "취소",
                    click: () => {
                        sendToEditor("undo");
                    },
                    accelerator: "CommandOrControl+Z"
                },
                {
                    label: "재실행",
                    click: () => {
                        sendToEditor("redo");
                    },
                    accelerator: "CommandOrControl+Shift+Z"
                }
            ]
        },
        {
            label: "도구",
            submenu: [
                {
                    label: "편집기 콘솔",
                    click: () => {
                        editorWindow.webContents.toggleDevTools();
                    },
                    accelerator: "CommandOrControl+Shift+I"
                },
                {
                    label: "플레이 콘솔",
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: "플러그인",
            submenu: [
                {
                    label: "새 플러그인 생성",
                    click: () => sendToEditor("showPluginCreateModal")
                },
                {
                    label: "플러그인 전체 다시 빌드",
                    click: async () => {
                        if (!pluginManager) return;
                        await pluginManager.updateAllPluginInfo(true);
                    }
                }
            ]
        },
        {
            label: "보기",
            submenu: [
                {
                    label: "확대",
                    click: () => {
                        sendToEditor("zoom", 1);
                    },
                    accelerator: "CommandOrControl+="
                },
                {
                    label: "축소",
                    click: () => {
                        sendToEditor("zoom", -1);
                    },
                    accelerator: "CommandOrControl+-"
                },
                {
                    label: "화면에 맞추기",
                    click: () => {
                        sendToEditor("zoom-fit");
                    },
                    accelerator: "CommandOrControl+0"
                },
                { type: "separator" },
                {
                    label: "편집기 새로고침",
                    click: () => {
                        editorWindow.webContents.reloadIgnoringCache();
                    },
                    accelerator: "CommandOrControl+R"
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    editorWindow.setMenu(menu);

    editorWindow.on("ready-to-show", () => {
        editorWindow.show();
        editorWindow.focus();
        if (data) editorWindow.setAlwaysOnTop(!!data?.config?.alwaysOnTop, "screen-saver");
    });

    editorWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    if (is.dev) {
        editorWindow.loadURL("http://localhost:3101");
    } else {
        editorWindow.loadFile(join(__dirname, "../editor/index.html"));
    }

    editorWindow.on("close", () => {
        isEditorOn = false;
        editorWindow = null;
        sendToMain("monitor-event", "end");
    });
}

async function appOpenedWithProject(argv, appWasRunning = true) {
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
    await projectFileManager.importProject(filePath);

    return true;
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on("second-instance", async (event, argv) => {
        if (!mainWindow) return;

        await appOpenedWithProject(argv, true);
    });

    app.on("ready", async () => {
        electronApp.setAppUserModelId("com.repair2");

        if (!(await appOpenedWithProject(process.argv, false))) {
            showSplash(is.dev);
            await Promise.all([new Promise((res) => setTimeout(res, 3000)), loadData()]);
        }

        setupIpcHandlers({
            assetDir,
            dataDir,
            getData: () => data,
            getEditorWindow: () => editorWindow,
            getGlobalCss: () => cssCode,
            getMainWindow: () => mainWindow,
            getPluginManager: () => pluginManager,
            getStore: () => store,
            createEditorWindow,
            findService,
            reportDiagnostic,
            saveData,
            sendToEditor,
            sendToMain,
            serial,
            socket
        });

        if (is.dev) {
            setTimeout(() => {
                createMainWindow();
                createEditorWindow();
            }, 1000);
        } else {
            createMainWindow();
        }
    });
}

app.on("window-all-closed", () => {
    app.quit();
});

const store = new Store();
