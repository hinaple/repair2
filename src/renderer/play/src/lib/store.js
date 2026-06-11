import { registerUtils } from "./repairUtils";
import { registerPluginContextApi } from "./plugin/pluginContext";
import { ipc } from "./ipc";

export function getStore(key) {
    return ipc.invoke("get-store", key);
}
export function setStore(key, value) {
    return ipc.send("set-store", key, value);
}

registerUtils("store", { get: getStore, set: setStore });
registerPluginContextApi("store", { get: getStore, set: setStore });
