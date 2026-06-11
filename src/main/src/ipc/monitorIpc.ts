import { ipc } from "./ipcMethods";

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
    ipc.on("monitor-event", (event, ...data: unknown[]) => {
        sendToMain("monitor-event", ...data);
    });
    ipc.on("monitor-info", (event, ...data: unknown[]) => {
        sendToEditor("monitor-info", ...data);
    });

    ipc.on("custom-log", (evt, content: unknown) => {
        reportProjectCustomLog(content);
    });
}
