import { ipcRenderer } from "electron";
import { getVariables } from "../variables";
import { preloads } from "../resources";
import { WaitingSteps } from "../stepActions";
import { getAppData } from "../appdata";
import { getComponents } from "../components";

let changesBuffer: Array<Array<string | string[]>> = [];

type ChangeType = "step" | "preload" | "variable" | "entry" | "component";
export function sendChanges(
    type: "step",
    status: "executed" | "started" | "ended",
    target: string
): void;
export function sendChanges(type: "preload", status: "added" | "released", target: string): void;
export function sendChanges(
    type: "variable",
    status: "changed",
    target: string,
    value: string
): void;
export function sendChanges(
    type: "entry",
    status: "entered" | "disabled" | "activated",
    target: string
): void;
export function sendChanges(
    type: "component",
    status: "set" | "removed" | "cleared",
    target?: string | string[]
): void;
export function sendChanges(
    type: ChangeType,
    status: string,
    target?: string | string[],
    data?: string
): void {
    if (!monitoring) return;

    changesBuffer.push(
        target ? (data ? [type, status, target, data] : [type, status, target]) : [type, status]
    );
    readyToFlush();
}

const FLUSH_TIME_MS = 5;
let isReadyToFlush = false;
let flushTimeout: NodeJS.Timeout | number = 0;
function readyToFlush() {
    if (isReadyToFlush) return;

    isReadyToFlush = true;
    flushTimeout = setTimeout(flush, FLUSH_TIME_MS);
}

function flush() {
    ipcRenderer.send("monitor-info", "update", changesBuffer);
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

export function sendTotalInfo() {
    if (!monitoring) return;
    discard();

    const variables = new Map(Object.entries(getVariables()).map(([k, v]) => [k, v.value]));
    const preloadedArr = Object.keys(preloads);
    const steps = WaitingSteps.values().reduce(
        (map: Map<string, number>, { id }) => map.set(id, (map.get(id) ?? 0) + 1),
        new Map()
    );
    const entries = getAppData()
        .nodes.values()
        .filter((node: any) => node.type === "entry" && node.standbyMode && node.activated)
        .map((node: any) => node.id)
        .toArray();
    const components = getComponents().map((c) => c.realId);

    ipcRenderer.send("monitor-info", "total", {
        variables,
        preloads: preloadedArr,
        steps,
        entries,
        components
    });
}

let monitoring: boolean = false;
ipcRenderer.addListener("monitor-event", (evt, channel: string) => {
    if (channel === "start") {
        monitoring = true;
        sendTotalInfo();
    } else if (channel === "end") monitoring = false;
});
