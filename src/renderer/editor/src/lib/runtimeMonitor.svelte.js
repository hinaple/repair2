import { ipcRenderer } from "electron";

let receivedTotal = false;
const RuntimeData = {
    variables: new Map(),
    steps: new Map(),
    preloads: new Set(),
    entries: new Set()
};

ipcRenderer.addListener("monitor-info", (evt, channel, data) => {
    if (channel === "total") handleTotalInfo(data);
    else if (channel === "update") {
        for (const singleUpdate of data) {
            handleChange(...singleUpdate);
        }
    }
});

function handleTotalInfo(obj) {
    RuntimeData.variables = new Map(obj.variables);
    RuntimeData.steps = new Map(obj.steps);
    RuntimeData.preloads = new Set(obj.preloads);
    RuntimeData.entries = new Set(obj.entries);

    for (const type in RuntimeSubscriptions) {
        RuntimeSubscriptions[type]
            .entries()
            .forEach(([id, callback]) => callback(getCurrentStatus(type, id)));
    }

    receivedTotal = true;
}
const ChangesTotalTypeMap = {
    step: "steps",
    preload: "preloads",
    variable: "variables",
    entry: "entries"
};
function handleChange(type, status, target, data = null) {
    if (!receivedTotal) return;

    if (type === "step") handleStepChange(status, target);
    else if (type === "preload") handlePreloadChange(status, target);
    else if (type === "variable") handleVariableChange(status, target, data);
    else if (type === "entry") handleEntryChange(status, target);

    const TotalType = ChangesTotalTypeMap[type];
    RuntimeSubscriptions[TotalType].get(target)?.(getCurrentStatus(TotalType, target));
}
function handleVariableChange(status, target, value) {
    RuntimeData.variables.set(target, value);
}
function handleStepChange(status, target) {
    if (status === "started")
        RuntimeData.steps.set(target, (RuntimeData.steps.get(target) ?? 0) + 1);
    else if (status === "ended")
        RuntimeData.steps.set(target, Math.min(0, (RuntimeData.steps.get(target) ?? 1) - 1));
}
function handlePreloadChange(status, target) {
    if (status === "added") RuntimeData.preloads.add(target);
    else if (status === "released") RuntimeData.preloads.delete(target);
}
function handleEntryChange(status, target) {
    if (status === "activated") RuntimeData.entries.add(target);
    else if (status === "disabled") RuntimeData.entries.delete(target);
}

const RuntimeSubscriptions = {
    steps: new Map(),
    entries: new Map(),
    variables: new Map(),
    preloads: new Map()
};

export function startMonitoring(type, id, callback) {
    RuntimeSubscriptions[type].set(id, callback);
    callback(getCurrentStatus(type, id));
    return () => {
        if (RuntimeSubscriptions[type].get(id) === callback) RuntimeSubscriptions[type].delete(id);
    };
}

function getCurrentStatus(type, id) {
    if (type === "variables") return RuntimeData.variables.get(id) ?? null;
    if (type === "steps") return !!RuntimeData.steps.get(id);
    else return RuntimeData[type].has(id);
}
