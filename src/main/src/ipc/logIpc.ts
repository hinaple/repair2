import { ipc } from "./ipcMethods";
import type { MainApp } from "../app/mainApp";

export function setupLogIpc(app: MainApp) {
    app.logStore.subscribe((change) => {
        app.message.sendToEditor("log:changed", change);
    });

    ipc.handle("log:list", (evt, filter = {}) => {
        return app.logStore.list(filter);
    });

    ipc.handle("log:get", (evt, id) => {
        return app.logStore.get(id);
    });

    ipc.on("log:report", async (evt, payload) => {
        await app.reportLog(payload, true);
    });
}
