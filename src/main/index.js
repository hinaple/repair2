import { app, shell, BrowserWindow, ipcMain, Menu } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import fs from "fs/promises";

import DataTemplate from "./dataTemplate.json";

let mainWindow, editorWindow;

let data;
function saveData(tempData) {
    data = { ...tempData, updatedAt: new Date().getTime() };
    return fs.writeFile(join(__dirname, "../../data/data.json"), JSON.stringify(data));
}
async function loadData() {
    try {
        const tempData = (await fs.readFile(join(__dirname, "../../data/data.json"))).toString();
        data = JSON.parse(tempData);
    } catch (err) {
        await saveData(DataTemplate);
    }
    return true;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        fullscreen: true,
        show: false,
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: false
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
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    editorWindow.setMenu(
        Menu.buildFromTemplate([
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
            }
        ])
    );
    // editorWindow.setAlwaysOnTop(true);

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
    electronApp.setAppUserModelId("com.electron");

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
    evt.reply(true);
    mainWindow.webContents.send("data", data);
});
ipcMain.on("editor-on", () => {
    createEditorWindow();
});
ipcMain.on("unsaved", () => {
    if (!editorWindow) return;
    editorWindow.setTitle("Editor ●");
});
ipcMain.on("saved", () => {
    if (!editorWindow) return;
    editorWindow.setTitle("Editor");
});
