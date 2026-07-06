export const NODE_TYPES = ["sequence", "entry", "branch", "variableSet"] as const;
export const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"] as const;

export const PROJECT_RECORDS = [
  "resources",
  "variables",
  "nodes",
  "steps",
  "components",
  "elements",
  "listeners",
  "valueProcesses",
  "pluginPointers",
  "values"
] as const;
