import { ipcRenderer } from "electron";

let changesBuffer: Array<Array<string>> = [];

type ChangeType = "step" | "preload" | "variable" | "entry";
export function sendChanges(
    type: "step",
    target: string,
    status: "executed" | "started" | "ended"
): void;
export function sendChanges(type: "preload", target: string, status: "added" | "released"): void;
export function sendChanges(type: "variable", target: string, status: "changed"): void;
export function sendChanges(
    type: "entry",
    target: string,
    status: "executed" | "activated" | "disabled"
): void;
export function sendChanges(type: ChangeType, status: string, target: string): void {
    changesBuffer.push([type, status, target]);

    readyToFlush();
}

const FLUSH_TIME_MS = 10;
let isReadyToFlush = false;
let flushTimeout: NodeJS.Timeout | number = 0;
function readyToFlush() {
    if (isReadyToFlush) return;

    isReadyToFlush = true;
    flushTimeout = setTimeout(flush, FLUSH_TIME_MS);
}

function flush() {
    ipcRenderer.send("monitor-data-update", changesBuffer);
    clear();
}
function clear() {
    changesBuffer = [];
    flushTimeout = 0;
    isReadyToFlush = false;
}
function discard() {
    clearTimeout(flushTimeout);
    clear();
}

export function sendTotalInfo() {}
