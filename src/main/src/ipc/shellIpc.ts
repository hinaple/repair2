import { ipcMain, shell } from "electron";

export function setupShellIpc() {
    ipcMain.on("open-dir", (evt, dir: string) => {
        shell.openPath(dir);
    });
}
