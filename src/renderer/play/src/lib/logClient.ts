import { ipcRenderer } from "electron";
import { logContent } from "@shared/logContent";
import type { LogEntryInput, LogEntryInputWithContent } from "@shared/log.types";

export function reportLog(payload: LogEntryInput) {
    const newPayload: LogEntryInputWithContent = {
        ...payload,
        content: logContent(payload.content)
    };
    ipcRenderer.send("log:report", newPayload);
}
