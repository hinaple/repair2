import { ipcRenderer } from "electron";
import { getAppData } from "./appdata";

ipcRenderer.on("socket-income", (event, channel, data) => {
    if (channel === "connect") getAppData().executeEntry("Communication.Socket.connect");
    else getAppData().executeEntry("Communication.Socket.ondata", { channel, data });
});

ipcRenderer.on("serial-income", (event, data) => {
    getAppData().executeEntry("Communication.serialData", { whenDataIs: data.trim() });
});

export function socketConnect(url) {
    ipcRenderer.send("socket-connect", url);
}
export function socketSend(channel, data) {
    ipcRenderer.send("socket-send", channel, data);
}
export function socketDisconnect() {
    ipcRenderer.send("socket-disconnect");
}

export function serialOpen(alias, port, baudRate) {
    ipcRenderer.send("serial-open", alias, port, baudRate);
}
export function serialSend(data) {
    ipcRenderer.send("serial-send", data);
}
export function serialClose() {
    ipcRenderer.send("serial-close");
}
