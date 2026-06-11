import ProjectFileManager from "../project/projectFileManager";
import SocketConnector from "../communication/socket";
import SerialConnector from "../communication/serial";
import { logger } from "../logs/logger";
import type {
    MainService,
    ProjectFileManagerService,
    SerialService,
    SocketService
} from "./mainApp.types";
import type { PluginManager } from "../plugin/pluginManager";
import type { MainApp } from "./mainApp";

export class MainAppServices implements MainService {
    #pluginManager: PluginManager | null = null;
    #projectFileManager: ProjectFileManagerService | null = null;
    #socket: SocketService | null = null;
    #serial: SerialService | null = null;

    get pluginManager() {
        return this.#pluginManager;
    }

    set pluginManager(pluginManager) {
        this.#pluginManager = pluginManager;
    }

    get projectFileManager() {
        if (!this.#projectFileManager) {
            throw new Error("ProjectFileManager service is not initialized.");
        }
        return this.#projectFileManager;
    }

    get socket() {
        if (!this.#socket) throw new Error("Socket service is not initialized.");
        return this.#socket;
    }

    get serial() {
        if (!this.#serial) throw new Error("Serial service is not initialized.");
        return this.#serial;
    }

    initialize(app: MainApp) {
        this.#projectFileManager = this.#createProjectFileManager(app);
        this.#socket = this.#createSocketConnector(app);
        this.#serial = this.#createSerialConnector(app);
        this.#registerGlobalKeyBridge(app);
    }

    #createProjectFileManager(app: MainApp) {
        return new ProjectFileManager(app, {
            beforeImport: () => {
                logger.info("IMPORT STARTED NOW");
                app.startup.showSplash();
                app.controllers.window.closeProjectWindows();
                return Promise.all([
                    app.controllers.pluginHmr.setHmrActive(false),
                    app.controllers.pluginHmr.destroyPluginManager()
                ]);
            },
            importProgress: app.startup.sendStartupInfo,
            afterImport: async () => {
                logger.info("IMPORTING DONE");
                await app.controllers.project.loadData();
                if (app.state.window.main) {
                    app.state.window.main.webContents.reloadIgnoringCache();
                } else {
                    app.controllers.window.createMainWindow();
                }
            },
            exportProgress: (progress: number | null) => {
                app.message.sendToEditor("exporting", progress);
            },
            afterExport: (filePath: string) => {
                app.message.sendToEditor("exported", filePath);
            }
        });
    }

    #createSocketConnector(app: MainApp) {
        return new SocketConnector((channel, data, url) => {
            if (!app.state.window.main) return;

            logger.info("SOCKET INCOMING:" + channel);

            app.message.sendToEditor("socket-income", channel, data, url);
            app.message.sendToPlay("socket-income", channel, data);
        });
    }

    #createSerialConnector(app: MainApp) {
        return new SerialConnector(
            (data) => {
                if (!app.state.window.main) return;

                logger.info("SERIAL INCOMING:" + data);

                app.message.sendToEditor("serial-income", data);
                app.message.sendToPlay("serial-income", data);
            },
            (port) => {
                app.message.sendToEditor("serial-connected", port);
            }
        );
    }

    #registerGlobalKeyBridge(app: MainApp) {
        app.globalKey.setGlobalKeyListener((type, evt) => {
            if (app.state.window.main?.isFocused?.()) {
                app.message.sendToPlay("global-key-event", type, evt);
            }
        });
    }
}
