import { shell } from "electron";
import { ipc } from "./ipcMethods";

export function setupShellIpc() {
    ipc.on("open-dir", (evt, dir: string) => {
        shell.openPath(dir);
    });
}
