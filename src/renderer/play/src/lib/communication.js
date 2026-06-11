import { getAppData } from "./appdata";
import { emitRepairEvent } from "./event";
import { registerUtils } from "./repairUtils";
import { ipc } from "./ipc";

ipc.on("socket-income", (event, channel, ...data) => {
    if (channel === "connect") getAppData().enterEntry("Communication.Socket.connect");
    else getAppData().enterEntry("Communication.Socket.ondata", { channel, data: data?.[0] });
    emitRepairEvent("socket", channel, ...data);
    console.log(`SOCKET DATA INCOME | channel: "${channel}", data: "${data}"`);
});

ipc.on("serial-income", (event, data) => {
    getAppData().enterEntry("Communication.serialData", { whenDataIs: data.trim() });
    emitRepairEvent("serial", data);
    console.log(`SERIAL DATA: "${data}"`);
});

export function socketConnect(url) {
    ipc.send("socket-connect", url);
}
export function socketConnectService(type, name) {
    ipc.send("socket-connect-service", type, name);
}
export function socketSend(channel, ...data) {
    ipc.send("socket-send", channel, ...data);
}
export function socketDisconnect() {
    ipc.send("socket-disconnect");
}

export function serialOpen(alias, port, baudRate) {
    ipc.send("serial-open", alias, port, baudRate);
}
export function serialSend(data) {
    ipc.send("serial-send", data);
}
export function serialClose() {
    ipc.send("serial-close");
}

registerUtils("communication", {
    socketSend,
    serialSend
});
