import { logStore } from "../logs/logStore";
import type { LogPayload, ReportLog } from "../logs/reportLog";
import { ipc } from "./ipcMethods";

type LogIpcOptions = {
    sendToEditor: (channel: string, ...params: unknown[]) => void;
    reportLog: ReportLog;
};

export function setupLogIpc({ sendToEditor, reportLog }: LogIpcOptions) {
    logStore.subscribe((change) => {
        sendToEditor("log:changed", change);
    });

    ipc.handle("log:list", (evt, filter = {}) => {
        return logStore.list(filter);
    });

    ipc.handle("log:get", (evt, id: string) => {
        return logStore.get(id);
    });

    ipc.on("log:report", async (evt, payload: LogPayload) => {
        await reportLog(payload, true);
    });
}
