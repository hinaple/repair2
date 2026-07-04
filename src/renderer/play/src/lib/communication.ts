import { getProject } from "../project";
import { emitRepairEvent } from "./event";
import { registerUtils } from "./repairUtils";
import { ipc } from "./ipc";
import { registerPluginContextApi } from "./plugin/pluginContext";

ipc.on("socket-income", (event, channel, ...data) => {
    if (channel === "connect") getProject().enterEntries("Communication.Socket.connect");
    else
        getProject().enterEntries("Communication.Socket.ondata", {
            channel,
            data: data?.[0] as any
        });
    emitRepairEvent("socket", channel, ...data);
    console.log(`SOCKET DATA INCOME | channel: "${channel}", data: "${data}"`);
});

ipc.on("serial-income", (event, data) => {
    getProject().enterEntries("Communication.serialData", { whenDataIs: data.trim() });
    emitRepairEvent("serial", data);
    console.log(`SERIAL DATA: "${data}"`);
});

export function socketConnect(url: string) {
    ipc.send("socket-connect", url);
}
export function socketConnectService(type: string, name: string) {
    ipc.send("socket-connect-service", type, name);
}
export function socketSend(channel: string, ...data: unknown[]) {
    ipc.send("socket-send", channel, ...data);
}
export function socketDisconnect() {
    ipc.send("socket-disconnect");
}

export function serialOpen(alias?: string, port?: string, baudRate?: number) {
    ipc.send("serial-open", alias, port, baudRate);
}
export function serialSend(data: unknown) {
    ipc.send("serial-send", data);
}
export function serialClose() {
    ipc.send("serial-close");
}

const Api = {
    socketSend,
    serialSend
};

registerUtils("communication", Api);
registerPluginContextApi("communication", Api);
