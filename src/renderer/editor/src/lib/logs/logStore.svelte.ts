import { ipcRenderer } from "electron";
import { SvelteMap } from "svelte/reactivity";
import type { LogChange, LogEntry, LogListFilter } from "@shared/log.types";

export const logKeys: string[] = $state([]);
export const logs: SvelteMap<string, LogEntry> = new SvelteMap();

async function updateLogs(filter: LogListFilter = {}) {
    const l = await ipcRenderer.invoke("log:list", filter);
    console.log(l);
}
updateLogs();

ipcRenderer.on("log:changed", (_, change: LogChange) => {
    console.log(change);
});
