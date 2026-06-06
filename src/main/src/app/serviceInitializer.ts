import ProjectFileManager from "../project/projectFileManager";
import SocketConnector from "../communication/socket";
import SerialConnector from "../communication/serial";
import type { ReportLog } from "../logs/reportLog";
import type { MainContext } from "./mainContext.types";
import { cli } from "../console";

type ServiceInitializerOptions = {
    context: MainContext;
    isDev: boolean;
    appVersion: string;
    clearStore: () => Promise<unknown> | unknown;
    reportLog: ReportLog;
    sendStartupInfo: (message: string) => void;
    showSplash: (isDev: boolean, appVersion: string) => void;
    setGlobalKeyListener: (listener: (type: string, evt: unknown) => void) => void;
};

export class ServiceInitializer {
    #appVersion: string;
    #clearStore: () => Promise<unknown> | unknown;
    #context: MainContext;
    #isDev: boolean;
    #reportLog: ReportLog;
    #sendStartupInfo: (message: string) => void;
    #setGlobalKeyListener: (listener: (type: string, evt: unknown) => void) => void;
    #showSplash: (isDev: boolean, appVersion: string) => void;

    constructor({
        context,
        isDev,
        appVersion,
        clearStore,
        reportLog,
        sendStartupInfo,
        showSplash,
        setGlobalKeyListener
    }: ServiceInitializerOptions) {
        this.#appVersion = appVersion;
        this.#clearStore = clearStore;
        this.#context = context;
        this.#isDev = isDev;
        this.#reportLog = reportLog;
        this.#sendStartupInfo = sendStartupInfo;
        this.#setGlobalKeyListener = setGlobalKeyListener;
        this.#showSplash = showSplash;
    }

    initializeServices() {
        const { service } = this.#context;
        service.projectFileManager = this.#createProjectFileManager();
        service.socket = this.#createSocketConnector();
        service.serial = this.#createSerialConnector();
        this.#registerGlobalKeyBridge();
    }

    #createProjectFileManager() {
        const { state, controllers, message, paths } = this.#context;
        return new ProjectFileManager(paths.dataDir, {
            getDialogOwnerWindow: () => state.window.editor ?? state.window.main,
            beforeImport: () => {
                cli.status("IMPORT STARTED NOW");
                this.#showSplash(this.#isDev, this.#appVersion);
                controllers.window.closeProjectWindows();
                return Promise.all([
                    controllers.pluginHmr.setHmrActive(false),
                    controllers.pluginHmr.destroyPluginManager()
                ]);
            },
            importProgress: this.#sendStartupInfo,
            afterImport: async () => {
                cli.status("IMPORTING DONE");
                await controllers.project.loadData();
                if (state.window.main) state.window.main.webContents.reloadIgnoringCache();
                else controllers.window.createMainWindow();

                await this.#clearStore();
            },
            exportProgress: (progress: number | null) => {
                message.sendToEditor("exporting", progress);
            },
            afterExport: (filePath: string) => {
                message.sendToEditor("exported", filePath);
            },
            reportLog: this.#reportLog
        });
    }

    #createSocketConnector() {
        const { state, message } = this.#context;
        return new SocketConnector((channel, data, url) => {
            if (!state.window.main) return;

            cli.info("SOCKET INCOMING:" + channel);

            message.sendToEditor("socket-income", channel, data, url);
            message.sendToMain("socket-income", channel, data);
        });
    }

    #createSerialConnector() {
        const { state, message } = this.#context;
        return new SerialConnector(
            (data) => {
                if (!state.window.main) return;

                cli.info("SERIAL INCOMING:" + data);

                message.sendToEditor("serial-income", data);
                message.sendToMain("serial-income", data);
            },
            (port) => {
                message.sendToEditor("serial-connected", port);
            }
        );
    }

    #registerGlobalKeyBridge() {
        const { state, message } = this.#context;
        this.#setGlobalKeyListener((type, evt) => {
            if (state.window.main?.isFocused?.()) message.sendToMain("global-key-event", type, evt);
        });
    }
}
