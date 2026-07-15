import { ipcRenderer } from "electron";

let messagePort: MessagePort;

function callListeners(channel: string, ...data: any[]) {
  listeners.get(channel)?.forEach((cb) => cb(...data));
}

ipcRenderer.on("messagePort", (e) => {
  messagePort = e.ports[0];

  callListeners("start");

  messagePort.addEventListener("message", (evt) => {
    const l = listeners.get(evt.data.channel);

    if (!l) {
      console.warn(`Sent "${evt.data.channel}" message but there is no registered listener.`);
      return;
    }

    callListeners(evt.data.channel, ...evt.data.data);
  });
  messagePort.addEventListener("close", () => {
    callListeners("end");
  });
});

function send(channel: string, ...data: any) {
  if (!messagePort) throw new Error("Renderer message port is not registered.");

  messagePort.postMessage({ channel, data });
}

const listeners = new Map<string, ((...data: any[]) => unknown)[]>();
function on(channel: string, callback: (...data: any[]) => unknown) {
  let arr = listeners.get(channel);
  if (!arr) {
    arr = [];
    listeners.set(channel, arr);
  }
  arr.push(callback);
}

export const message = {
  send,
  on
};

export type * from "./types";
