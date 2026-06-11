import { ipcRenderer, type IpcRendererEvent } from "electron";
import type {
    MainToPlaySendMap,
    RendererToMainInvokeMap,
    RendererToMainSendMap,
    RendererToMainSyncMap
} from "@shared/ipc.types";

type MainToPlayListener<K extends keyof MainToPlaySendMap> = (
    event: IpcRendererEvent,
    ...args: MainToPlaySendMap[K]
) => void;

function on<K extends keyof MainToPlaySendMap>(channel: K, listener: MainToPlayListener<K>) {
    return ipcRenderer.on(channel, listener as Parameters<typeof ipcRenderer.on>[1]);
}

function send<K extends keyof RendererToMainSendMap>(
    channel: K,
    ...args: RendererToMainSendMap[K]
) {
    return ipcRenderer.send(channel, ...args);
}

function sendSync<K extends keyof RendererToMainSyncMap>(
    channel: K,
    ...args: RendererToMainSyncMap[K]["args"]
): RendererToMainSyncMap[K]["result"] {
    return ipcRenderer.sendSync(channel, ...args);
}

function invoke<K extends keyof RendererToMainInvokeMap>(
    channel: K,
    ...args: RendererToMainInvokeMap[K]["args"]
): Promise<RendererToMainInvokeMap[K]["result"]> {
    return ipcRenderer.invoke(channel, ...args);
}

export const ipc = {
    on,
    send,
    sendSync,
    invoke
};
