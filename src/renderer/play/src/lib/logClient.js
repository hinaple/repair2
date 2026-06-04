import { ipcRenderer } from "electron";

export function reportLog(payload) {
    ipcRenderer.send("log:report", payload);
}
