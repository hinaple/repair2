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

ipc.on("mqtt-income", (_, topic, data) => {
  getProject().enterEntries("Communication.Mqtt.ondata", { topic, data });
  emitRepairEvent("mqtt:message", topic, data);
  console.log(`MQTT DATA at ${topic}: "${data}"`);
});
ipc.on("mqtt-connected", (_) => {
  getProject().enterEntries("Communication.Mqtt.connect");
  emitRepairEvent("mqtt:connected");
  console.log(`MQTT connected`);
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

export function mqttConnect(url: string, topics: string[]) {
  ipc.send("mqtt-connect", url, topics);
}
export function mqttPublish(topic: string, message: string) {
  ipc.send("mqtt-publish", topic, message);
}
export function mqttDisconnect() {
  ipc.send("mqtt-disconnect");
}

const Api = {
  socketSend,
  serialSend,
  mqttPublish
};

registerUtils("communication", Api);
registerPluginContextApi("communication", Api);
