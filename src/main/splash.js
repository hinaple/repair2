import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { root } from "./dirs";

/** @type {BrowserWindow | null} */
let splashWindow = null;
let version = null;

let onSplashClose = null;

export function showSplash(isDev = false) {
    if (splashWindow) return;

    console.log("SPLASH WINDOW OPENING");

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
        splashWindow.show();
        splashWindow.focus();
        // splashWindow.setAlwaysOnTop(true, "pop-up-menu");
    });

    splashWindow.loadFile(
        join(root, isDev ? "src/renderer/splash/index.html" : "splash/index.html")
    );

    splashWindow.on("close", (evt) => {
        evt.preventDefault();
    });

    version = __APP_VERSION__;
}

export function sendStartupInfo(string) {
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

export function afterSplashClose(callback) {
    if (!splashWindow) {
        callback();
        return;
    }
    onSplashClose = callback;
}

ipcMain.handle("request-version", () => {
    return version;
});
