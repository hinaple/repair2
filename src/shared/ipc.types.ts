import type {
    MessageBoxOptions,
    MessageBoxReturnValue,
    OpenDialogOptions,
    OpenDialogReturnValue
} from "electron";
import type { EditorInitialData, ProjectData } from "./projectData.types";
import type { LogChange, LogEntry, LogEntryInput, LogListFilter } from "./log.types";
import type {
    ManifestErrorForRenderer,
    PluginErrorPayload,
    PluginList,
    PluginRendererInfo,
    PluginSingleUpdate,
    PluginType
} from "./plugin.types";

export type IpcNoArgs = [];

export type IpcSocketIncomeArgs = [channel: string, data: unknown, url?: string];

export type IpcRuntimeMonitorChange =
    | [type: "step", status: "executed" | "started" | "ended", target: string]
    | [type: "preload", status: "added" | "released", target: string]
    | [type: "variable", status: "changed", target: string, value: string]
    | [type: "entry", status: "entered" | "disabled" | "activated", target: string]
    | [type: "component", status: "set" | "removed" | "cleared", target?: string | string[]];

export type IpcRuntimeMonitorTotal = {
    variables: Map<string, unknown>;
    preloads: string[];
    steps: Map<string, number>;
    entries: string[];
    components: string[];
};

export type IpcRuntimeMonitorInfoArgs =
    | [channel: "update", data: IpcRuntimeMonitorChange[]]
    | [channel: "total", data: IpcRuntimeMonitorTotal]
    | [channel: string, data?: unknown];

export type IpcPluginRuntimeCallPayload = {
    pluginName: string;
    activationId: string;
    methodName: string;
    args: unknown[];
};

export type RendererToMainInvokeMap = {
    "request-version": {
        args: IpcNoArgs;
        result: string;
    };
    selectFile: {
        args: [options: OpenDialogOptions];
        result: OpenDialogReturnValue;
    };
    dialog: {
        args: [options: MessageBoxOptions];
        result: MessageBoxReturnValue;
    };
    copyInfoAsset: {
        args: [sources: string[]];
        result: string[];
    };
    "get-store": {
        args: [key: string];
        result: unknown;
    };
    "update-data": {
        args: [data: ProjectData];
        result: boolean;
    };
    "log:list": {
        args: [filter?: LogListFilter];
        result: LogEntry[];
    };
    "log:get": {
        args: [id: string];
        result: LogEntry | null;
    };
    "plugin:get-list": {
        args: IpcNoArgs;
        result: PluginList;
    };
    "plugin:get-manifest-errors": {
        args: IpcNoArgs;
        result: ManifestErrorForRenderer[];
    };
    "plugin:runtime:activate": {
        args: [
            pluginName: string,
            payload: {
                activationId: string;
                rendererMethods: string[];
                attributes: Record<string, unknown>;
            }
        ];
        result: string[] | null;
    };
    "plugin:runtime:deactivate": {
        args: [
            payload: {
                pluginName: string;
                activationId: string;
            }
        ];
        result: boolean | undefined;
    };
    "plugin:runtime:to-main": {
        args: [payload: IpcPluginRuntimeCallPayload];
        result: unknown;
    };
    "plugin:create": {
        args: [
            payload: {
                name: string;
                type:
                    | "runtime"
                    | "runtime-with-main"
                    | "element"
                    | "frame"
                    | "function"
                    | "transition"
                    | "svelte-element"
                    | "svelte-frame";
                isExternal: boolean;
            }
        ];
        result:
            | {
                  canceled: true;
                  error?: string;
              }
            | {
                  dir: string;
              };
    };
    "plugin:runtime-error": {
        args: [payload: PluginErrorPayload];
        result: void;
    };
    "vscode:is-installed": {
        args: IpcNoArgs;
        result: boolean;
    };
};

export type RendererToMainSendMap = {
    getDataDir: IpcNoArgs;
    "set-store": [key: string, value: unknown];
    "log:report": [
        payload: Omit<LogEntryInput, "createdAt" | "updatedAt" | "count"> & {
            log?: boolean;
            dialog?: boolean;
        }
    ];
    "socket-connect": [urls: string | string[]];
    "socket-connect-service": [type: string, name: string];
    "socket-send": [channel: string, ...data: unknown[]];
    "socket-disconnect": IpcNoArgs;
    "serial-open": [alias?: string, port?: string, baudRate?: number];
    "serial-send": [data: unknown];
    "serial-close": IpcNoArgs;
    "plugin:runtime:deactivate-all": IpcNoArgs;
    "editor-on": IpcNoArgs;
    unsaved: IpcNoArgs;
    saved: IpcNoArgs;
    "vscode:open": [sourcePath: string];
    "open-dir": [dir: string];
    "monitor-event": [channel: string, ...data: unknown[]];
    "monitor-info": IpcRuntimeMonitorInfoArgs;
    "custom-log": [content: any];
    "request-execute": [payload: { type: string; id: string }];
    "layout-preview": [payload: { compData: unknown; showContents?: unknown }];
    "preview-content-visible": [visible: boolean];
    "stop-preview": IpcNoArgs;
    "play-win-ready": IpcNoArgs;
    "request-save:done": [payload: { requestId: number; saved: boolean }];
};

export type RendererToMainSyncMap = {
    getDataDir: {
        args: IpcNoArgs;
        result: string;
    };
    "config:is-dev": {
        args: IpcNoArgs;
        result: boolean;
    };
    "request-data": {
        args: IpcNoArgs;
        result: EditorInitialData;
    };
};

export interface MainToRendererSharedSendMap {
    "socket-income": IpcSocketIncomeArgs;
    "serial-income": [data: string];
    "plugin:list": [
        payload: {
            plugins: PluginList;
            buildChanges: string[];
            manifestErrors: ManifestErrorForRenderer[];
        }
    ];
    "plugin:update": [payload: PluginSingleUpdate];
    "plugin:hmr": [payload: { info: PluginRendererInfo; cssCode?: string }];
    "plugin:removed": [payload: { name: string; type: PluginType }];
}

export interface MainToEditorSendMap extends MainToRendererSharedSendMap {
    "monitor-info": IpcRuntimeMonitorInfoArgs;
    "request-save": [request: { requestId: number }];
    "socket-failed": IpcNoArgs;
    "serial-connected": [port: string];
    exporting: [progress: number | null];
    exported: [filePath: string];
    undo: IpcNoArgs;
    redo: IpcNoArgs;
    zoom: [step: number];
    "zoom-fit": IpcNoArgs;
    "log:changed": [change: LogChange];
    "plugin:manifest-error": [errors: ManifestErrorForRenderer[]];
    "plugin:show-create-modal": IpcNoArgs;
}

export interface MainToPlaySendMap extends MainToRendererSharedSendMap {
    data: [data: EditorInitialData];
    "global-css": [css: string];
    "request-execute": [payload: { type: string; id: string }];
    "layout-preview": [payload: { compData: unknown; showContents?: unknown }];
    "preview-content-visible": [visible: boolean];
    "stop-preview": IpcNoArgs;
    "monitor-event": [channel: string, ...data: unknown[]];
    "global-key-event": [type: string, event: unknown];
    "plugin:runtime:to-renderer": [payload: IpcPluginRuntimeCallPayload];
}

export interface MainToSplashSendMap {
    "startup-info": [message: string];
}

export type MainToRendererSendMap = MainToEditorSendMap & MainToPlaySendMap & MainToSplashSendMap;

export type IpcInvokeChannel = keyof RendererToMainInvokeMap;
export type IpcSendChannel = keyof RendererToMainSendMap;
export type IpcSyncChannel = keyof RendererToMainSyncMap;
export type IpcMainToRendererChannel = keyof MainToRendererSendMap;
export type IpcMainToRendererSharedChannel = keyof MainToRendererSharedSendMap;
export type IpcMainToEditorChannel = keyof MainToEditorSendMap;
export type IpcMainToPlayChannel = keyof MainToPlaySendMap;
export type IpcMainToSplashChannel = keyof MainToSplashSendMap;
