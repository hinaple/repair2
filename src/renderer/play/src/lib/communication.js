import { ipcRenderer } from "electron";
import { getAppData } from "./appdata";
import { emitRepairEvent } from "./event";
import { registerUtils } from "./repairUtils";

ipcRenderer.on("socket-income", (event, channel, ...data) => {
    if (channel === "connect") getAppData().enterEntry("Communication.Socket.connect");
    else getAppData().enterEntry("Communication.Socket.ondata", { channel, data: data?.[0] });
    emitRepairEvent("socket", channel, ...data);
    console.log(`SOCKET DATA INCOME | channel: "${channel}", data: "${data}"`);
});

ipcRenderer.on("serial-income", (event, data) => {
    getAppData().enterEntry("Communication.serialData", { whenDataIs: data.trim() });
    emitRepairEvent("serial", data);
    console.log(`SERIAL DATA: "${data}"`);
});

export function socketConnect(url) {
    ipcRenderer.send("socket-connect", url);
}
export function socketConnectService(type, name) {
    ipcRenderer.send("socket-connect-service", type, name);
}
export function socketSend(channel, ...data) {
    ipcRenderer.send("socket-send", channel, ...data);
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

registerUtils("communication", {
    socketSend,
    serialSend
});
