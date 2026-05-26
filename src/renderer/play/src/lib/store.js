import { ipcRenderer } from "electron";
import { registerUtils } from "./repairUtils";
import { registerPluginContextApi } from "./plugin/pluginContext";

export function getStore(key) {
    return ipcRenderer.sendSync("get-store", key);
}
export function setStore(key, value) {
    return ipcRenderer.send("set-store", key, value);
}

registerUtils("store", { get: getStore, set: setStore });
registerPluginContextApi("store", { get: getStore, set: setStore });
