import { ipcRenderer } from "electron";
import { SvelteMap } from "svelte/reactivity";
import type { LogChange, LogEntry, LogListFilter } from "@shared/log.types";

export const logInfo: {
    keys: string[];
    logs: SvelteMap<string, LogEntry>;
} = $state({
    keys: [],
    logs: new SvelteMap()
});

async function updateLogs(filter: LogListFilter = {}) {
    const logs = (await ipcRenderer.invoke("log:list", filter)) as LogEntry[];
    logInfo.keys = [];
    logInfo.logs.clear();
    logs.forEach(appendLog);
}
updateLogs();

function appendLog(log: LogEntry) {
    logInfo.keys.push(log.id);
    logInfo.logs.set(log.id, log);
}

ipcRenderer.on("log:changed", (_, change: LogChange) => {
    if (change.type === "append") {
        appendLog(change.entry);
    } else {
        logInfo.logs.set(change.entry.id, change.entry);
    }
});
