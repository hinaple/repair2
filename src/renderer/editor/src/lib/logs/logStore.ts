import type { LogChange, LogEntry, LogListFilter } from "@shared/log.types";
import { ipc } from "../ipc";

export const Logs: Map<string, LogEntry> = new Map();

async function updateLogs(filter: LogListFilter = {}) {
    const logs = (await ipc.invoke("log:list", filter)) as LogEntry[];
    // logInfo.keys = [];
    Logs.clear();
    logs.forEach(appendLog);
}
updateLogs();

function appendLog(log: LogEntry) {
    // logInfo.keys.push(log.id);
    Logs.set(log.id, log);
}

type UpdateCallback = (change: LogChange, logs: typeof Logs) => void;
const subscribers: Set<UpdateCallback> = new Set();
export function subscribeLog(update: UpdateCallback): () => void {
    subscribers.add(update);

    return () => subscribers.delete(update);
}

ipc.on("log:changed", (_, change: LogChange) => {
    if (change.type === "append") {
        appendLog(change.entry);
    } else {
        Logs.set(change.entry.id, change.entry);
    }
    subscribers.forEach((update) => update(change, Logs));
});
