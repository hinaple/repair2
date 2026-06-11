import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from "electron";
import type {
    RendererToMainInvokeMap,
    RendererToMainSendMap,
    RendererToMainSyncMap
} from "@shared/ipc.types";

type MaybePromise<T> = T | Promise<T>;

type InvokeListener<K extends keyof RendererToMainInvokeMap> = (
    event: IpcMainInvokeEvent,
    ...args: RendererToMainInvokeMap[K]["args"]
) => MaybePromise<RendererToMainInvokeMap[K]["result"]>;

type SendListener<K extends keyof RendererToMainSendMap> = (
    event: IpcMainEvent,
    ...args: RendererToMainSendMap[K]
) => void;

type SyncListener<K extends keyof RendererToMainSyncMap> = (
    event: IpcMainEvent,
    ...args: RendererToMainSyncMap[K]["args"]
) => void;

function handle<K extends keyof RendererToMainInvokeMap>(
    channel: K,
    listener: InvokeListener<K>
) {
    return ipcMain.handle(channel, listener as Parameters<typeof ipcMain.handle>[1]);
}

function on<K extends keyof RendererToMainSendMap>(channel: K, listener: SendListener<K>): void;
function on<K extends keyof RendererToMainSyncMap>(channel: K, listener: SyncListener<K>): void;
function on(channel: string, listener: (event: IpcMainEvent, ...args: unknown[]) => void) {
    ipcMain.on(channel, listener);
}

export const ipc = {
    handle,
    on
};
