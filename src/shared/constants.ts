import type { Types } from "./projectData/types";
import type { ValueOf } from "./utils.types";

export const NODE_TYPES = ["sequence", "entry", "branch", "variableSet"] as const;
export const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"] as const;

export const PROJECT_RECORDS = {
  resources: "resource",
  variables: "variable",
  nodes: "node",
  steps: "step",
  components: "component",
  elements: "element",
  listeners: "listener",
  valueProcesses: "valueProcess",
  pluginPointers: "pluginPointer",
  values: "value"
} as const;

export type RecordKey = keyof typeof PROJECT_RECORDS;
export type RecordValue<K extends RecordKey = RecordKey> = ValueOf<Types.Data[K]>;
