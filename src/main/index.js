import { app, shell, BrowserWindow, ipcMain, Menu, protocol, dialog } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import fs from "fs/promises";
import { pathToFileURL } from "url";

import DataTemplate from "./dataTemplate.json";

protocol.registerSchemesAsPrivileged([
    {
        scheme: "asset",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
            stream: true,
            bypassCSP: true,
            allowServiceWorkers: true,
            codeCache: true
        }
    }
]);

let mainWindow, editorWindow;

let data;

const dataDir = is.dev ? join(__dirname, "../../data") : join(app.getPath("exe"), "..", "data");

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
        fullscreen: true,
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

    protocol.handle("asset", async (request) => {
        try {
            const url = new URL(request.url);
            const filePath = join(dataDir, "assets", decodeURIComponent(url.host + url.pathname));
            const fileExists = await fs
                .access(filePath)
                .then(() => true)
                .catch(() => false);

            if (!fileExists) {
                return new Response("File not found", { status: 404 });
            }

            const fileContent = await fs.readFile(filePath);
            return new Response(fileContent);
        } catch (error) {
            console.error("Asset protocol error:", error);
            return new Response("Error loading file", { status: 500 });
        }
    });

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
