import type { BrowserWindow } from "electron";
import type { ProjectData } from "@shared/projectData.types";
import type { PluginManager } from "../plugin/pluginManager";
import type { SetHmrActive } from "../hmrs";
import type { ReportLog } from "../logs/reportLog";
import type { PluginHmrController } from "../controllers/pluginHmrController";
import type { ProjectController } from "../controllers/projectController";
import type { ServiceInitializer } from "./serviceInitializer";
import type { WindowController } from "../windows/windows";

export type ProjectFileManagerService = {
    importing: boolean;
    exporting: boolean;
    importProject: (filePath: string) => Promise<unknown>;
    exportProject: (projectName: string) => Promise<boolean>;
    selectImportProject: () => Promise<boolean>;
};

export type SocketService = {
    connected: boolean;
    connect: (urls: string | string[]) => Promise<boolean>;
    send: (channel: string, ...data: unknown[]) => void;
    disconnect: () => void;
};

export type SerialService = {
    open: (portAlias?: string, path?: string, baudRate?: number) => Promise<void>;
    send: (data: unknown) => void;
    close: () => void;
};

export type MainState = {
    project: {
        data: ProjectData | null;
        cssCode: string;
    };
    window: {
        main: BrowserWindow | null;
        editor: BrowserWindow | null;
    };
    hmr: {
        setter: SetHmrActive | null;
        importing: Promise<unknown> | null;
        isActive: boolean;
    };
    device: {
        isVscodeInstalled: boolean | null;
    };
    editorSave: {
        nextRequestId: number;
        pending: {
            requestId: number;
            promise: Promise<boolean>;
            resolve: (saved: boolean) => void;
            timeoutId: NodeJS.Timeout;
        } | null;
    };
};

export type MainService = {
    pluginManager: PluginManager | null;
    projectFileManager: ProjectFileManagerService;
    socket: SocketService;
    serial: SerialService;
};

export type MainControllers = {
    pluginHmr: PluginHmrController;
    project: ProjectController;
    serviceInitializer: ServiceInitializer;
    window: WindowController;
};

export type MainEditorSave = {
    requestEditorSave: () => Promise<boolean>;
    resolveEditorSaveRequest: (requestId: number, saved: boolean) => void;
};

export type MainMessage = {
    sendToMain: (channel: string, ...params: unknown[]) => void;
    sendToEditor: (channel: string, ...params: unknown[]) => void;
};

export type MainLog = {
    reportLog: ReportLog;
};

export type MainPaths = {
    assetDir: string;
    dataDir: string;
    defaultProjectFile: string;
    emptyProjectFile: string;
};

export type MainSystem = {
    app: typeof import("electron").app;
    dialog: typeof import("electron").dialog;
    shell: typeof import("electron").shell;
};

export type MainStore = {
    getStore: () => Promise<{
        get: (key: string) => unknown;
        set: (key: string, value: unknown) => void;
    }>;
};

export type MainContext = {
    state: MainState;
    service: MainService;
    controllers: MainControllers;
    editorSave: MainEditorSave;
    message: MainMessage;
    log: MainLog;
    paths: MainPaths;
    store: MainStore;
    system: MainSystem;
};
