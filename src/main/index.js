import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from "electron";
import { basename, extname, join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import fs from "fs/promises";
import { watch } from "fs";
import PluginPackageManager from "./plugin-package-manager";

// import DataTemplate from "./dataTemplate.json";

import SerialConnector from "./communication/serial";
import SocketConnector from "./communication/socket";
import ProjectFileManager from "./projectFileManager";

let mainWindow, editorWindow;
let pluginManager;

let data;

const dataDir = is.dev ? join(__dirname, "../../data") : join(app.getPath("exe"), "..", "data");
const assetDir = join(dataDir, "assets");
const pluginDir = join(dataDir, "plugins");
const styleDir = join(dataDir, "styles");

const defaultPath = is.dev
    ? join(__dirname, "../../resources/default.repair")
    : join(app.getPath("exe"), "..", "default.repair");

async function initializePluginSystem() {
    pluginManager = new PluginPackageManager(pluginDir, join(app.getPath("userData"), "packages"));
    await pluginManager.initialize();
}

const projectFileManager = new ProjectFileManager(dataDir, () => {
    if (editorWindow) editorWindow.close();
    if (cssWatcher) {
        cssWatcher.close();
        cssWatcher = null;
    }
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
    await projectFileManager.importProject(defaultPath);
    await loadData();
    if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
}

let globalCss = "";
let cssWatcher;
async function loadGlobalCss() {
    try {
        globalCss = (await fs.readFile(join(styleDir, "global.css"))).toString();
        globalCss = globalCss.replace(/%FONTS%/g, join(styleDir, "fonts").replace(/\\/g, "/"));
        if (mainWindow) mainWindow.webContents.send("global-css", globalCss);

        watchGlobalStyles();
    } catch (err) {
        globalCss = "";
    }
}
function watchGlobalStyles() {
    if (cssWatcher) return;

    cssWatcher = watch(join(styleDir, "global.css"), (eventType) => {
        if (eventType === "change") {
            console.log("Global CSS file has changed");
            loadGlobalCss();
        }
    });
}
async function loadData() {
    try {
        await fs.access(dataDir);
        const tempData = (await fs.readFile(join(dataDir, "data.json"))).toString();
        data = JSON.parse(tempData);
    } catch (err) {
        await importDefaultProject();
    }
    await Promise.all([updatePluginList(), loadGlobalCss()]);
    return true;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        ...(is.dev ? { width: 1920, height: 1080 } : { fullscreen: true }),
        show: false,
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        title: data?.config?.title ?? "REPAIRv2"
    });
    mainWindow.setMenu(null);

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
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
                        await projectFileManager.selectImportProject();
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

app.on("ready", async () => {
    electronApp.setAppUserModelId("com.repair2");

    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

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
        createEditorWindow();
    }
});

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
        mainWindow?.setTitle(data?.config?.title ?? "REPAIRv2");
        mainWindow.webContents.send("data", data);
        return true;
    });
    //#endregion

    //#region editor IPCs
    ipcMain.on("editor-on", () => {
        if (!editorWindow) createEditorWindow();
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
        event.returnValue = await dialog.showMessageBoxSync(opt);
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
}
