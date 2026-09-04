import { typedEntries } from "@shared/utils.types";
import { play } from "./msg";
import type { MsgRuntimeMonitorChange, MsgRuntimeMonitorTotal } from "@renderer/messagePort";

interface RuntimeMonitorData {
  variables: Map<string, string | null>;
  steps: Map<string, number>;
  preloads: Set<string>;
  entries: Set<string>;
  components: Set<string>;
}
type RuntimeMonitorType = keyof RuntimeMonitorData;
type RuntimeStatus<T extends RuntimeMonitorType> = T extends "variables" ? string | null : boolean;
type RuntimeSubscriptionMap = {
  [K in RuntimeMonitorType]: Map<string, (d: RuntimeStatus<K>) => unknown>;
};

let receivedTotal = false;
const RuntimeData: RuntimeMonitorData = {
  variables: new Map(),
  steps: new Map(),
  preloads: new Set(),
  entries: new Set(),
  components: new Set()
};

play.on("start", () => {
  play.send("monitor:start");
});

play.on("monitor:info", (channel, data) => {
  if (channel === "total") handleTotalInfo(data);
  else if (channel === "update") {
    for (const singleUpdate of data) {
      handleChange(singleUpdate);
    }
  }
});

function handleTotalInfo(obj: MsgRuntimeMonitorTotal) {
  RuntimeData.variables = obj.variables;
  RuntimeData.steps = obj.steps;
  RuntimeData.preloads = new Set(obj.preloads);
  RuntimeData.entries = new Set(obj.entries);
  RuntimeData.components = new Set(obj.components);

  for (const [type] of typedEntries(RuntimeSubscriptions)) {
    notifyAllSubscriptions(type);
  }

  receivedTotal = true;
}
type RuntimeTypeByChangeType = {
  step: "steps";
  preload: "preloads";
  variable: "variables";
  entry: "entries";
  component: "components";
};
const ChangesTotalTypeMap = {
  step: "steps",
  preload: "preloads",
  variable: "variables",
  entry: "entries",
  component: "components"
} satisfies RuntimeTypeByChangeType;
function handleChange(params: MsgRuntimeMonitorChange) {
  if (!receivedTotal) return;

  if (params[0] === "step") handleStepChange(params);
  else if (params[0] === "preload") handlePreloadChange(params);
  else if (params[0] === "variable") handleVariableChange(params);
  else if (params[0] === "entry") handleEntryChange(params);
  else if (params[0] === "component") handleComponentChange(params);

  if (params[0] === "component" && params[1] === "set") {
    RuntimeSubscriptions.components.forEach((callback, id) =>
      callback(getCurrentStatus("components", id))
    );
    return;
  }
  const TotalType = ChangesTotalTypeMap[params[0]];
  notifySubscription(TotalType, params[2]);
}

type ChangeParam<type extends MsgRuntimeMonitorChange[0]> = Extract<
  MsgRuntimeMonitorChange,
  [type, ...unknown[]]
>;

function handleVariableChange([_, status, target, value]: ChangeParam<"variable">) {
  RuntimeData.variables.set(target, value);
}
function handleStepChange([_, status, target]: ChangeParam<"step">) {
  if (status === "started") RuntimeData.steps.set(target, (RuntimeData.steps.get(target) ?? 0) + 1);
  else if (status === "ended")
    RuntimeData.steps.set(target, Math.max(0, (RuntimeData.steps.get(target) ?? 1) - 1));
}
function handlePreloadChange([_, status, target]: ChangeParam<"preload">) {
  if (status === "added") RuntimeData.preloads.add(target);
  else if (status === "released") RuntimeData.preloads.delete(target);
}
function handleEntryChange([_, status, target]: ChangeParam<"entry">) {
  if (status === "activated") RuntimeData.entries.add(target);
  else if (status === "disabled") RuntimeData.entries.delete(target);
}
function handleComponentChange([_, status, target]: ChangeParam<"component">) {
  if (status === "set") RuntimeData.components = new Set(target);
  else if (status === "created") RuntimeData.components.add(target);
  else if (status === "removed") RuntimeData.components.delete(target);
}

const RuntimeSubscriptions = Object.fromEntries(
  Object.keys(RuntimeData).map((k) => [k, new Map()])
) as RuntimeSubscriptionMap;

function notifyAllSubscriptions<T extends RuntimeMonitorType>(type: T) {
  RuntimeSubscriptions[type].forEach((callback, id) => {
    callback(getCurrentStatus(type, id));
  });
}

function notifySubscription<T extends RuntimeMonitorType>(type: T, id: string) {
  RuntimeSubscriptions[type].get(id)?.(getCurrentStatus(type, id));
}

export function startMonitoring<T extends keyof RuntimeMonitorData>(
  type: T,
  id: string,
  callback: (d: RuntimeStatus<T>) => unknown
) {
  RuntimeSubscriptions[type].set(id, callback);
  callback(getCurrentStatus(type, id));
  return () => {
    if (RuntimeSubscriptions[type].get(id) === callback) RuntimeSubscriptions[type].delete(id);
  };
}

function getCurrentStatus<T extends RuntimeMonitorType>(type: T, id: string): RuntimeStatus<T> {
  if (type === "variables") return (RuntimeData.variables.get(id) ?? null) as RuntimeStatus<T>;
  if (type === "steps") return !!RuntimeData.steps.get(id) as RuntimeStatus<T>;
  else return RuntimeData[type].has(id) as RuntimeStatus<T>;
}
