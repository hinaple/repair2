import { registerUtils } from "./repairUtils";
import { ipc } from "./ipc";
import { registerPluginContextApi } from "./plugin/pluginContext";

function getStore<T = unknown>(key: string): Promise<T> {
  return ipc.invoke("get-store", key) as Promise<T>;
}
function setStore(key: string, value: unknown): Promise<void> {
  return ipc.invoke("set-store", key, value);
}

const Api = {
  get: getStore,
  set: setStore
};

registerUtils("store", Api);
registerPluginContextApi("store", Api);
