import { app, BrowserWindow, dialog, Menu } from "electron";
import { copyFile, symlink, unlink } from "fs/promises";
import { join } from "path";
import { checkVscodeInstalled, openVsCode } from "../vscodeUtils";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import makeLog from "../logger";

const execAsync = promisify(exec);

const DEVTOOL_DIR = join(app.getPath("userData"), "plugin-devtool");

let devtoolWindow;
let viteCmd;

function killCmd() {
    if (!viteCmd) return;
    exec(`taskkill /PID ${viteCmd.pid} /T /F`);
    viteCmd = null;
}

let pluginDir = null;
export function initPluginDir(pd) {
    pluginDir = pd;
}

let installing = false;
let running = false;

async function build(pluginName, directory = "elements") {
    try {
        spawn("npm", ["run", "build"], {
            cwd: DEVTOOL_DIR,
            shell: true,
            stdio: "inherit",
            detached: true
        }).on("exit", async () => {
            const builtFile = join(DEVTOOL_DIR, "dist/plugin.js");
            const targetFile = join(pluginDir, directory, `${pluginName}.js`);
            await copyFile(builtFile, targetFile);
            dialog.showMessageBox(devtoolWindow, {
                type: "info",
                message: "빌드가 완료되었습니다.",
                noLink: true
            });
        });
    } catch (err) {
        console.error(err);
        const logFile = await makeLog("plugin-build-err", JSON.stringify(err, null, 4));
        dialog.showMessageBox(devtoolWindow, {
            type: "error",
            title: "플러그인 빌드 오류",
            message: "플러그인을 빌드하는 도중 오류가 발생했습니다.",
            detail: `에러 로그 파일: ${logFile}`
        });
    }
}
export async function openPluginDevtool(targetPluginDir, pluginName) {
    if (installing) return;

    if (running) {
        killCmd();
        devtoolWindow.close();
        devtoolWindow = null;
    }

    running = true;
    installing = true;
    const Target = join(DEVTOOL_DIR, "plugin");
    try {
        await unlink(Target);
    } catch {}
    try {
        await symlink(targetPluginDir, Target, "junction");
        console.log(targetPluginDir, Target);
        if (await checkVscodeInstalled()) openVsCode(Target);
        await execAsync("npm i", { cwd: DEVTOOL_DIR });
    } catch {}
    installing = false;

    viteCmd = spawn("npm", ["run", "dev"], {
        cwd: DEVTOOL_DIR,
        shell: true,
        stdio: "inherit",
        detached: true
    });
    viteCmd.on("close", () => {
        running = false;
        viteCmd = null;
        if (!devtoolWindow) return;
        devtoolWindow.close();
        devtoolWindow = null;
    });
    devtoolWindow = new BrowserWindow({
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

    const MenuTemplate = [
        {
            label: "파일",
            submenu: [
                {
                    label: "빌드",
                    accelerator: "CommandOrControl+B",
                    click: async () => {
                        build(pluginName);
                    }
                },
                {
                    label: "프레임으로 빌드",
                    accelerator: "CommandOrControl+Shift+B",
                    click: async () => {
                        build(pluginName, "frames");
                    }
                },
                { type: "separator" },
                {
                    label: "새로고침",
                    accelerator: "CommandOrControl+R",
                    click: () => {
                        devtoolWindow.webContents.reloadIgnoringCache();
                    }
                }
            ]
        },
        { label: "도구", submenu: [{ label: "개발자도구", role: "toggleDevTools" }] }
    ];
    devtoolWindow.setMenu(Menu.buildFromTemplate(MenuTemplate));
    devtoolWindow.on("closed", () => {
        running = false;
        devtoolWindow = null;
        killCmd();
    });

    devtoolWindow.on("ready-to-show", () => {
        devtoolWindow.show();
        devtoolWindow.focus();
        devtoolWindow.webContents.openDevTools();
    });

    devtoolWindow.loadURL("http://localhost:5533");
}

export function updateData(data) {
    if (!devtoolWindow) return;
    devtoolWindow.webContents.send("data", data);
}
