import type {
  MessageBoxOptions,
  MessageBoxReturnValue,
  OpenDialogOptions,
  OpenDialogReturnValue
} from "electron";
import type { EditorInitialData, RuntimeProjectData, Types } from "./projectData/types";
import type { LogChange, LogEntry, LogEntryInput, LogListFilter } from "./log.types";
import type {
  ManifestErrorForRenderer,
  PluginErrorPayload,
  PluginList,
  PluginRendererInfo,
  PluginSingleUpdate,
  PluginType
} from "./plugin.types";
import type { GlobalKeyEvent } from "./globalKeyEvent.types";
import type { EditorMenuAction } from "./editorMenu";

export type IpcNoArgs = [];

export type IpcSocketIncomeArgs = [channel: string, data: unknown, url?: string];

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
    args: [data: RuntimeProjectData];
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
        typescript: boolean;
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
  "mqtt-connect": [url: string, topics: string[]];
  "mqtt-publish": [topic: string, message: string];
  "mqtt-disconnect": [];
  "plugin:runtime:deactivate-all": IpcNoArgs;
  "editor-on": IpcNoArgs;
  unsaved: IpcNoArgs;
  saved: IpcNoArgs;
  "vscode:open": [sourcePath: string];
  "open-dir": [dir: string];
  "custom-log": [content: any];
  "play-win-ready": IpcNoArgs;
  "message-port:ready": IpcNoArgs;
  "request-save:done": [payload: { requestId: number; saved: boolean }];
  "editor-menu-action": [action: EditorMenuAction];
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
  "mqtt-income": [topic: string, data: string];
  "mqtt-connected": [];
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
  "request-save": [request: { requestId: number }];
  "socket-failed": IpcNoArgs;
  "serial-connected": [port: string];
  exporting: [progress: number | null];
  exported: [filePath: string];
  zoom: [step: number];
  "log:changed": [change: LogChange];
  "plugin:manifest-error": [errors: ManifestErrorForRenderer[]];
  "menu-action": [action: EditorMenuAction];
}

export interface MainToPlaySendMap extends MainToRendererSharedSendMap {
  data: [data: EditorInitialData];
  "global-css": [css: string];
  "global-key-event": [type: "keydown" | "keyup", event: GlobalKeyEvent];
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
