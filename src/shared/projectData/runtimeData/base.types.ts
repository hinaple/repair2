import type { Override } from "../../utils.types";
import type {
  Data,
  Component,
  Element,
  Listener,
  Node,
  PluginPointer,
  Resource,
  Step,
  Value,
  ValueProcess,
  Variable
} from "../v2Data.types";

export type RuntimeProjectData = Override<
  Data,
  {
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
  }
>;
