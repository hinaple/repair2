import { ipcRenderer } from "electron";

let messagePort: MessagePort | undefined;

function callListeners(channel: string, ...data: any[]) {
  listeners.get(channel)?.forEach((cb) => cb(...data));
}

ipcRenderer.on("messagePort", (e) => {
  const nextPort = e.ports[0];
  if (!nextPort) return;

  if (messagePort) {
    const previousPort = messagePort;
    messagePort = undefined;
    previousPort.close();
    callListeners("end");
  }

  messagePort = nextPort;

  nextPort.addEventListener("message", (evt) => {
    const l = listeners.get(evt.data.channel);

    if (!l) {
      console.warn(`Sent "${evt.data.channel}" message but there is no registered listener.`);
      return;
    }

    callListeners(evt.data.channel, ...evt.data.data);
  });
  nextPort.addEventListener("close", () => {
    if (messagePort !== nextPort) return;
    messagePort = undefined;
    callListeners("end");
  });

  nextPort.start();
  callListeners("start");
});

ipcRenderer.send("message-port:ready");

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
