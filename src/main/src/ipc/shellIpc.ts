import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";

export function setupShellIpc(app: MainApp) {
    ipc.on("open-dir", (evt, dir) => {
        app.system.shell.openPath(dir);
    });
}
