import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";

export function setupStoreIpc(app: MainApp) {
    ipc.handle("get-store", async (evt, key) => {
        return await app.store.get(key);
    });
    ipc.on("set-store", async (evt, key, value) => {
        await app.store.set(key, value);
    });
}
