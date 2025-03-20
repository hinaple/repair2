import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from "electron";
import { basename, extname, join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import fs from "fs/promises";

import DataTemplate from "./dataTemplate.json";

let mainWindow, editorWindow;

let data;

const dataDir = is.dev ? join(__dirname, "../../data") : join(app.getPath("exe"), "..", "data");
const assetDir = join(dataDir, "assets");
const pluginDir = join(dataDir, "plugins");

async function saveData(tempData) {
    data = { ...tempData, updatedAt: new Date().getTime() };
    return await fs.writeFile(join(dataDir, "data.json"), JSON.stringify(data)).catch((e) => {
        console.error(e);
        return false;
    });
}
async function loadData() {
    try {
        const tempData = (await fs.readFile(join(dataDir, "data.json"))).toString();
        data = JSON.parse(tempData);
    } catch (err) {
        await saveData(DataTemplate);
    }
    return true;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        show: false,
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
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
    mainWindow.webContents.toggleDevTools();

    mainWindow.on("closed", () => {
        app.quit();
    });
}

let isEditorOn = false;
function createEditorWindow() {
    if (isEditorOn) return;
    isEditorOn = true;
    editorWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        alwaysOnTop: !is.dev,
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

    if (is.dev) editorWindow.webContents.toggleDevTools();

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

app.whenReady().then(async () => {
    electronApp.setAppUserModelId("com.repair2");

    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    await loadData();

    createMainWindow();
    // if (is.dev)
    createEditorWindow();

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
            // if (is.dev)
            createEditorWindow();
        }
    });
});

// app.on("window-all-closed", () => {
//     if (process.platform !== "darwin") {
//         app.quit();
//     }
// });

ipcMain.on("request-data", (evt) => {
    evt.returnValue = data;
});
ipcMain.on("update-data", async (evt, tempData) => {
    await saveData(tempData);
    mainWindow.webContents.send("data", data);
    evt.returnValue = true;
});
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

const PluginTypes = ["elements", "frames", "functions", "transitions"];

let pluginList = {};
export async function updatePluginList() {
    pluginList = {};
    await Promise.all(
        PluginTypes.map((type) => {
            return new Promise((res) => {
                fs.readdir(join(pluginDir, type)).then((files) => {
                    pluginList[type] = files;
                    res();
                });
            });
        })
    );
    return pluginList;
}
updatePluginList();

ipcMain.on("getPluginList", async (event, update) => {
    if (update) await updatePluginList();
    event.returnValue = pluginList;
});
