import { logContent } from "@shared/logContent";
import type { LogEntryInput, LogEntryInputWithContent } from "@shared/log.types";
import { ipc } from "./ipc";

export function reportLog(payload: LogEntryInput) {
    const newPayload: LogEntryInputWithContent = {
        ...payload,
        content: logContent(payload.content)
    };
    ipc.send("log:report", newPayload);
}
