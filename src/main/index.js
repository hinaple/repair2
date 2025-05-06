import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from "electron";
import { basename, extname, join } from "path";
import { electronApp, is } from "@electron-toolkit/utils";
import fs from "fs/promises";
import { watch } from "fs";

// import DataTemplate from "./dataTemplate.json";

import SerialConnector from "./communication/serial";
import SocketConnector from "./communication/socket";
import ProjectFileManager from "./projectFileManager";
import PluginPackageManager from "./plugin-package-manager";
import { getFullScreenArea, getPrimaryScreenArea } from "./screenManager";

let mainWindow, editorWindow;
let pluginManager;

let data;

const dataDir = join(app.getPath("userData"), is.dev ? "dev_project" : "project");
const assetDir = join(dataDir, "assets");
const pluginDir = join(dataDir, "plugins");
const styleDir = join(dataDir, "styles");

const templateDir = is.dev
    ? join(__dirname, "../../templates")
    : join(app.getPath("exe"), "..", "templates");

async function initializePluginSystem() {
    pluginManager = new PluginPackageManager(pluginDir, join(app.getPath("userData"), "packages"));
    await pluginManager.initialize();
}

const projectFileManager = new ProjectFileManager(dataDir, () => {
    if (editorWindow) editorWindow.close();
    Object.keys(watchers).forEach((key) => {
        if (watchers[key]) {
            watchers[key].close();
            watchers[key] = null;
        }
    });
});

const PluginTypes = ["elements", "frames", "functions", "transitions"];

const socket = new SocketConnector((channel, data) => {
    if (!mainWindow) return;

    console.log("SOCKET INCOMING:", channel);

    mainWindow.webContents.send("socket-income", channel, data);
});

const serial = new SerialConnector((data) => {
    if (!mainWindow) return;

    console.log("SERIAL INCOMING:", data);

    mainWindow.webContents.send("serial-income", data);
});

let pluginList = {};
async function updatePluginList() {
    console.log("Updating plugin list");
    pluginList = {};
    await Promise.all(
        PluginTypes.map((type) => {
            return new Promise((res) => {
                fs.readdir(join(pluginDir, type))
                    .then((files) => {
                        pluginList[type] = files;
                        res();
                    })
                    .catch(() => {
                        res();
                    });
            });
        })
    );
    return pluginList;
}

async function saveData(tempData) {
    data = { ...tempData, updatedAt: new Date().getTime() };
    return await fs.writeFile(join(dataDir, "data.json"), JSON.stringify(data)).catch((e) => {
        console.error(e);
        return false;
    });
}

async function importDefaultProject() {
    await projectFileManager.importProject(join(templateDir, "default.repair"));
    await loadData();
    if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
}

let globalCss = "";
let watchers = { css: null };
async function loadGlobalCss() {
    try {
        globalCss = (await fs.readFile(join(styleDir, "global.css"))).toString();
        globalCss = globalCss.replace(/%FONTS%/g, join(styleDir, "fonts").replace(/\\/g, "/"));
        if (mainWindow) mainWindow.webContents.send("global-css", globalCss);

        watchGlobalStyles();
        watchPlugins();
    } catch (err) {
        globalCss = "";
    }
}
function watchGlobalStyles() {
    if (watchers.css) return;

    watchers.css = watch(join(styleDir, "global.css"), (eventType) => {
        if (eventType === "change") {
            console.log("Global CSS file has changed");
            loadGlobalCss();
        }
    });
}

const pluginHotReloadTimeouts = {};
function watchPlugins() {
    if (watchers.plugins) return;

    watchers.plugins = watch(pluginDir, { recursive: true }, (type, filename) => {
        if (type === "rename") {
            updatePluginList();
            return;
        }
        if (type !== "change") return;
        if (filename === "dependencies.json") {
            console.log("Plugin dependencies updated");
            pluginManager.updateDependencies();
            return;
        }
        const dirs = filename.split(/\\|\//);
        if (dirs.length !== 2 || !PluginTypes.includes(dirs[0])) return;

        if (pluginHotReloadTimeouts[filename]) clearTimeout(pluginHotReloadTimeouts[filename]);

        pluginHotReloadTimeouts[filename] = setTimeout(() => {
            delete pluginHotReloadTimeouts[filename];
            console.log(`Plugin Editted: ${dirs[0]} - ${dirs[1]}`);

            if (mainWindow)
                mainWindow.webContents.send("plugin-hmr", {
                    type: dirs[0],
                    name: dirs[1]
                });
        }, 100);
    });
}
async function loadData() {
    try {
        await fs.access(dataDir);
        const tempData = (await fs.readFile(join(dataDir, "data.json"))).toString();
        data = JSON.parse(tempData);

        applyDataConfig();
    } catch (err) {
        await importDefaultProject();
    }
    await Promise.all([updatePluginList(), loadGlobalCss()]);
    return true;
}

function applyDataConfig() {
    mainWindow?.setTitle?.(data?.config?.title ?? "REPAIRv2");

    const area = data?.config?.multiScreen ? getFullScreenArea() : getPrimaryScreenArea();

    mainWindow?.setSize?.(area.width, area.height);
    mainWindow?.setPosition?.(area.x, area.y);
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        title: data?.config?.title ?? "REPAIRv2",
        frame: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        movable: false
    });
    mainWindow.setMenu(null);

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();

        applyDataConfig();
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    if (is.dev) {
        mainWindow.loadURL("http://localhost:3100");
    } else {
        mainWindow.loadFile(join(__dirname, "../play/index.html"));
    }

    mainWindow.on("closed", () => {
        app.quit();
    });
}

let afterSave;
let isEditorOn = false;
function createEditorWindow() {
    if (isEditorOn) return;
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
                                data.config?.title ?? "REPAIRv2"
                            ))
                        )
                            return;

                        await projectFileManager.importProject(join("templates", "empty.repair"));
                        await loadData();
                        mainWindow.webContents.reloadIgnoringCache();
                    },
                    accelerator: "CommandOrControl+N"
                },
                { type: "separator" },
                {
                    label: "저장",
                    click: () => {
                        editorWindow.webContents.send("request-save");
                    },
                    accelerator: "CommandOrControl+S"
                },
                { type: "separator" },
                {
                    label: "프로젝트 불러오기",
                    click: async () => {
                        if (!(await projectFileManager.selectImportProject())) return;
                        await loadData();
                        mainWindow.webContents.reloadIgnoringCache();
                        createEditorWindow();
                    },
                    accelerator: "CommandOrControl+Shift+O"
                },
                {
                    label: "프로젝트 내보내기",
                    click: async () => {
                        editorWindow.webContents.send("request-save");
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
                    },
                    accelerator: "CommandOrControl+Shift+N"
                }
            ]
        },
        {
            label: "편집",
            submenu: [
                {
                    label: "취소",
                    click: () => {
                        editorWindow.webContents.send("undo");
                    },
                    accelerator: "CommandOrControl+Z"
                },
                {
                    label: "재실행",
                    click: () => {
                        editorWindow.webContents.send("redo");
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
                    }
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
            label: "보기",
            submenu: [
                {
                    label: "확대",
                    click: () => {
                        editorWindow.webContents.send("zoom", 1);
                    },
                    accelerator: "CommandOrControl+="
                },
                {
                    label: "축소",
                    click: () => {
                        editorWindow.webContents.send("zoom", -1);
                    },
                    accelerator: "CommandOrControl+numsub"
                },
                {
                    label: "화면에 맞추기",
                    click: () => {
                        editorWindow.webContents.send("zoom-fit");
                    },
                    accelerator: "CommandOrControl+0"
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    editorWindow.setMenu(menu);

    editorWindow.on("ready-to-show", () => {
        editorWindow.show();
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
    if (mainWindow) mainWindow.webContents.reloadIgnoringCache();

    return true;
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on("second-instance", async (event, argv) => {
        if (!mainWindow) return;

        if (await appOpenedWithProject(argv, true)) await loadData();
        mainWindow.show();
    });

    app.on("ready", async () => {
        electronApp.setAppUserModelId("com.repair2");

        await appOpenedWithProject(process.argv, false);

        await loadData();

        await initializePluginSystem();

        setupIpcHandlers();

        if (is.dev) {
            setTimeout(() => {
                createMainWindow();
                createEditorWindow();
            }, 1000);
        } else {
            createMainWindow();
            // createEditorWindow();
        }
    });
}

function setupIpcHandlers() {
    //#region plugin IPCs
    ipcMain.on("getPluginList", async (event, update) => {
        if (update) await updatePluginList();
        event.returnValue = pluginList;
    });

    ipcMain.handle("plugin:install-package", async (event, { name, version }) => {
        try {
            const packageInfo = await pluginManager.installPackage(name, version);
            return { success: true, packageInfo };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
    //#endregion

    //#region appdata IPCs
    ipcMain.on("request-data", (evt) => {
        evt.returnValue = { ...data, globalStyles: globalCss };
    });

    ipcMain.handle("update-data", async (evt, tempData) => {
        await saveData(tempData);
        afterSave?.();
        afterSave = null;
        applyDataConfig();
        mainWindow.webContents.send("data", { ...data, globalStyles: globalCss });
        return true;
    });
    //#endregion

    //#region editor IPCs
    ipcMain.on("editor-on", () => {
        if (!isEditorOn) createEditorWindow();
    });

    ipcMain.on("unsaved", () => {
        if (!editorWindow) return;
        editorWindow.setTitle("Editor ●");
    });

    ipcMain.on("saved", () => {
        if (!editorWindow) return;
        editorWindow.setTitle("Editor");
    });
    //#endregion

    //#region asset IPCs
    ipcMain.on("getDataDir", (evt) => {
        evt.returnValue = dataDir;
    });

    ipcMain.on("selectFile", async (event, opt) => {
        event.returnValue = await dialog.showOpenDialogSync(opt);
    });

    ipcMain.on("dialogue", async (event, opt) => {
        event.returnValue = await dialog.showMessageBoxSync({ ...opt, noLink: true });
    });

    ipcMain.on("copyInfoAsset", async (event, srcs) => {
        event.returnValue = await Promise.all(
            srcs.map(
                (s) =>
                    new Promise(async (res) => {
                        const ext = extname(s);
                        const bn = basename(s, ext);
                        let filename = basename(s);
                        for (let duplicatedCount = 2; ; duplicatedCount++) {
                            if (
                                await fs
                                    .access(join(assetDir, filename), fs.constants.F_OK)
                                    .then(() => false)
                                    .catch(() => true)
                            )
                                break;
                            filename = `${bn}(${duplicatedCount})${ext}`;
                        }
                        await fs.copyFile(s, join(assetDir, filename));
                        res(filename);
                    })
            )
        );
    });
    //#endregion

    //#region preview IPCs
    ipcMain.on("request-execute", (event, { type, id }) => {
        mainWindow.webContents.send("request-execute", { type, id });
    });

    ipcMain.on("layout-preview", (event, { compData }) => {
        mainWindow.webContents.send("layout-preview", { compData });
    });

    ipcMain.on("preview-content-visible", (event, visible) => {
        mainWindow.webContents.send("preview-content-visible", visible);
    });

    ipcMain.on("stop-preview", () => {
        mainWindow.webContents.send("stop-preview");
    });
    //#endregion

    //#region communication IPCs

    ipcMain.on("socket-connect", (event, url) => {
        socket.connect(url);
    });
    ipcMain.on("socket-send", (event, channel, data) => {
        socket.send(channel, data);
    });
    ipcMain.on("socket-disconnect", () => {
        socket.disconnect();
    });

    ipcMain.on("serial-open", (event, alias, port, baudRate) => {
        serial.open(alias, port, baudRate);
    });
    ipcMain.on("serial-send", (event, data) => {
        serial.send(data);
    });
    ipcMain.on("serial-close", () => {
        serial.close();
    });

    //#endregion

    //#region player monitoring IPCs

    ipcMain.on("executed-start", (event, { type, id }) => {
        if (!editorWindow) return;
        editorWindow.webContents.send("start-executed", { type, id });
    });
    ipcMain.on("executed-end", (event, { type, id }) => {
        if (!editorWindow) return;
        editorWindow.webContents.send("end-executed", { type, id });
    });

    //#endregion

    //#region screen detecting

    //#endregion
}
