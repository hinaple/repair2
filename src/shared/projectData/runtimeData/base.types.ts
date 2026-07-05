import type {
  Component,
  Element,
  Listener,
  Node,
  PluginPointer,
  ProjectConfig,
  Resource,
  Step,
  Value,
  ValueProcess,
  Variable
} from "../v2Data.types";

interface Data {
  config: ProjectConfig;
  resources: Map<string, Resource>;
  variables: Map<string, Variable>;
  nodes: Map<string, Node>;
  steps: Map<string, Step>;
  components: Map<string, Component>;
  elements: Map<string, Element>;
  listeners: Map<string, Listener>;
  valueProcesses: Map<string, ValueProcess>;
  pluginPointers: Map<string, PluginPointer>;
  values: Map<string, Value>;
  updatedAt: number;
}

export type { Data as RuntimeProjectData };
