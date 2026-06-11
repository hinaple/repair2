import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { logger } from "../logs/logger";
import type { MainApp } from "../app/mainApp";

export class MainAppStartup {
    #app: MainApp;
    #onSplashClose: (() => void) | null = null;
    #splashWindow: BrowserWindow | null = null;

    constructor(app: MainApp) {
        this.#app = app;

        ipcMain.handle("request-version", () => {
            return this.#app.version;
        });
    }

    showSplash() {
        if (this.#splashWindow) return;

        logger.info("SPLASH WINDOW OPENING");

        this.#splashWindow = new BrowserWindow({
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

        this.#splashWindow.setMenu(null);

        this.#splashWindow.on("ready-to-show", () => {
            this.#splashWindow?.show();
        });

        this.#splashWindow.loadFile(
            join(
                __dirname,
                this.#app.isDev ? "../../src/renderer/splash/index.html" : "../splash/index.html"
            )
        );

        this.#splashWindow.on("close", (evt) => {
            evt.preventDefault();
        });
    }

    sendStartupInfo = (message: string) => {
        this.#splashWindow?.webContents.send("startup-info", message);
    };

    closeSplash() {
        if (!this.#splashWindow) return;
        this.#splashWindow.destroy();
        this.#splashWindow = null;
        this.#onSplashClose?.();
        this.#onSplashClose = null;
    }

    afterSplashClose(callback: () => void) {
        if (!this.#splashWindow) {
            callback();
            return;
        }
        this.#onSplashClose = callback;
    }
}
