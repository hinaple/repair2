import { ipc } from "./ipc";

let receivedTotal = false;
const RuntimeData = {
    variables: new Map(),
    steps: new Map(),
    preloads: new Set(),
    entries: new Set(),
    components: new Set()
};

ipc.on("monitor-info", (evt, channel, data) => {
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
    RuntimeData.components = new Set(obj.components);

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
    entry: "entries",
    component: "components"
};
function handleChange(type, status, target, data = null) {
    if (!receivedTotal) return;

    if (type === "step") handleStepChange(status, target);
    else if (type === "preload") handlePreloadChange(status, target);
    else if (type === "variable") handleVariableChange(status, target, data);
    else if (type === "entry") handleEntryChange(status, target);
    else if (type === "component") handleComponentChange(status, target);

    if (type === "component" && status === "set") {
        RuntimeSubscriptions.components.forEach((callback, id) =>
            callback(getCurrentStatus("components", id))
        );
        return;
    }
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
function handleComponentChange(status, target) {
    if (status === "set") RuntimeData.components = new Set(target);
    else if (status === "created") RuntimeData.components.add(target);
    else if (status === "removed") RuntimeData.components.delete(target);
}

const RuntimeSubscriptions = Object.fromEntries(
    Object.keys(RuntimeData).map((k) => [k, new Map()])
);

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
