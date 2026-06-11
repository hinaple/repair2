import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";

export function setupPreviewIpc(app: MainApp) {
    ipc.on("request-execute", (event, { type, id }) => {
        app.message.sendToPlay("request-execute", { type, id });
    });

    ipc.on("layout-preview", (event, payload) => {
        app.message.sendToPlay("layout-preview", payload);
    });

    ipc.on("preview-content-visible", (event, visible) => {
        app.message.sendToPlay("preview-content-visible", visible);
    });

    ipc.on("stop-preview", () => {
        app.message.sendToPlay("stop-preview");
    });
}
