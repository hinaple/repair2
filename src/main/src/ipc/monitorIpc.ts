import { ipcMain } from "electron";

type MonitorIpcOptions = {
    sendToMain: (channel: string, ...params: unknown[]) => void;
    sendToEditor: (channel: string, ...params: unknown[]) => void;
    reportProjectCustomLog: (content: unknown) => unknown;
};

export function setupMonitorIpc({
    sendToMain,
    sendToEditor,
    reportProjectCustomLog
}: MonitorIpcOptions) {
    ipcMain.on("monitor-event", (event, ...data: unknown[]) => {
        sendToMain("monitor-event", ...data);
    });
    ipcMain.on("monitor-info", (event, ...data: unknown[]) => {
        sendToEditor("monitor-info", ...data);
    });

    ipcMain.on("custom-log", (evt, content: unknown) => {
        reportProjectCustomLog(content);
    });
}
