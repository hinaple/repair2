import { ipcMain } from "electron";
import { logStore } from "../logs/logStore";
import type { LogPayload, ReportLog } from "../logs/reportLog";

type LogIpcOptions = {
    sendToEditor: (channel: string, ...params: unknown[]) => void;
    reportLog: ReportLog;
};

export function setupLogIpc({ sendToEditor, reportLog }: LogIpcOptions) {
    logStore.subscribe((change) => {
        sendToEditor("log:changed", change);
    });

    ipcMain.handle("log:list", (evt, filter = {}) => {
        return logStore.list(filter);
    });

    ipcMain.handle("log:get", (evt, id: string) => {
        return logStore.get(id);
    });

    ipcMain.on("log:report", async (evt, payload: LogPayload = {}) => {
        await reportLog(payload);
    });
}
