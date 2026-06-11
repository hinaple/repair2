import type { BrowserWindow } from "electron";
import type { ProjectData } from "@shared/projectData.types";
import type { PluginManager } from "../plugin/pluginManager";
import type { SetHmrActive } from "../system/hmrs";
import type { ReportLog } from "../logs/reportLog";
import type { PluginHmrController } from "../controllers/pluginHmrController";
import type { ProjectController } from "../controllers/projectController";
import type { WindowController } from "../windows/windowController";
import type { MainToEditorSendMap, MainToPlaySendMap } from "@shared/ipc.types";
import type { NewDialogs } from "../system/dialog";

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
    window: WindowController;
};

export type MainEditorSave = {
    requestEditorSave: () => Promise<boolean>;
    resolveEditorSaveRequest: (requestId: number, saved: boolean) => void;
};

export type MainMessage = {
    sendToPlay: <K extends keyof MainToPlaySendMap>(
        channel: K,
        ...params: MainToPlaySendMap[K]
    ) => void;

    sendToEditor: <K extends keyof MainToEditorSendMap>(
        channel: K,
        ...params: MainToEditorSendMap[K]
    ) => void;
};

export type MainLog = {
    reportLog: ReportLog;
};

export type MainSystem = {
    app: typeof import("electron").app;
    dialog: NewDialogs;
    shell: typeof import("electron").shell;
};
