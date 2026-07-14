import * as electron from "electron";
import type { IpcRendererEvent } from "electron";
import type {
  MainToEditorSendMap,
  RendererToMainInvokeMap,
  RendererToMainSendMap,
  RendererToMainSyncMap
} from "@shared/ipc.types";

type MainToEditorListener<K extends keyof MainToEditorSendMap> = (
  event: IpcRendererEvent,
  ...args: MainToEditorSendMap[K]
) => void;

const ipcRenderer = electron.ipcRenderer;

function on<K extends keyof MainToEditorSendMap>(channel: K, listener: MainToEditorListener<K>) {
  return ipcRenderer?.on(channel, listener as Parameters<NonNullable<typeof ipcRenderer>["on"]>[1]);
}

function send<K extends keyof RendererToMainSendMap>(
  channel: K,
  ...args: RendererToMainSendMap[K]
) {
  return ipcRenderer?.send(channel, ...args);
}

function sendSync<K extends keyof RendererToMainSyncMap>(
  channel: K,
  ...args: RendererToMainSyncMap[K]["args"]
): RendererToMainSyncMap[K]["result"] {
  if (!ipcRenderer) throw new Error("ipcRenderer is unavailable outside an Electron renderer.");
  return ipcRenderer.sendSync(channel, ...args);
}

function invoke<K extends keyof RendererToMainInvokeMap>(
  channel: K,
  ...args: RendererToMainInvokeMap[K]["args"]
): Promise<RendererToMainInvokeMap[K]["result"]> {
  if (!ipcRenderer) throw new Error("ipcRenderer is unavailable outside an Electron renderer.");
  return ipcRenderer.invoke(channel, ...args);
}

export const ipc = {
  on,
  send,
  sendSync,
  invoke
};
