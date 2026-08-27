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

ipc.on("mqtt-income", (_, topic, data) => {
    getAppData().enterEntry("Communication.Mqtt.ondata", { topic, data });
    emitRepairEvent("mqtt:message", topic, data);
    console.log(`MQTT DATA at ${topic}: "${data}"`);
});
ipc.on("mqtt-connected", (_) => {
    getAppData().enterEntry("Communication.Mqtt.connect");
    emitRepairEvent("mqtt:connected");
    console.log(`MQTT connected`);
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

export function mqttConnect(url, topics) {
    ipc.send("mqtt-connect", url, topics);
}
export function mqttPublish(topic, message) {
    ipc.send("mqtt-publish", topic, message);
}
export function mqttDisconnect() {
    ipc.send("mqtt-disconnect");
}

registerUtils("communication", {
    socketSend,
    serialSend,
    mqttPublish
});
