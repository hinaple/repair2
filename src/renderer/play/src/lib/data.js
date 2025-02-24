import { ipcRenderer } from "electron";
import { writable } from "svelte/store";
import Sequence from "@classes/sequence";

const rawData = ipcRenderer.sendSync("request-data");
rawData.nodes = rawData.nodes.map((s) => new Sequence(s));
export const appData = writable(rawData);

ipcRenderer.on("data", (_, data) => {
    appData.set(data);
});
