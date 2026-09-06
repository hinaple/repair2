import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";

export function setupStoreIpc(app: MainApp) {
  ipc.handle("get-store", (evt, key) => {
    return app.store.get(key, true);
  });
  ipc.handle("set-store", (evt, key, value) => {
    return app.store.set(key, value, true);
  });

  ipc.handle("get-config", (evt, path) => {
    return app.config.get(path);
  });
  ipc.handle("set-config", (evt, path, value) => {
    return app.config.set(path, value);
  });
}
