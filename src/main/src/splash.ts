import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { cli } from "./console";

let splashWindow: BrowserWindow | null = null;
let version: string | null = null;

let onSplashClose: (() => void) | null = null;

export function showSplash(isDev = false, appVersion: string) {
    if (splashWindow) return;

    cli.status("SPLASH WINDOW OPENING");

    splashWindow = new BrowserWindow({
        width: 800,
        height: 500,
        frame: false,
        resizable: false,
        movable: false,
        center: true,
        transparent: true,
        show: false,
        closable: false,
        webPreferences: {
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    splashWindow.setMenu(null);

    splashWindow.on("ready-to-show", () => {
        splashWindow?.show();
    });

    splashWindow.loadFile(
        join(__dirname, isDev ? "../../src/renderer/splash/index.html" : "../splash/index.html")
    );

    splashWindow.on("close", (evt) => {
        evt.preventDefault();
    });

    version = appVersion;
}

export function sendStartupInfo(string: string) {
    if (!splashWindow) return;

    splashWindow.webContents.send("startup-info", string);
}

export function closeSplash() {
    if (!splashWindow) return;
    splashWindow.destroy();
    splashWindow = null;
    onSplashClose?.();
    onSplashClose = null;
}

export function afterSplashClose(callback: () => void) {
    if (!splashWindow) {
        callback();
        return;
    }
    onSplashClose = callback;
}

ipcMain.handle("request-version", () => {
    return version;
});
