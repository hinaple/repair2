import type {
  ElementTypePayload,
  EntryTypePayload,
  ListenerTypePayload,
  StepTypePayload,
  ValueProcessTypePayload
} from "./typePayload";
import type { Override } from "../utils.types";
import type * as V1 from "./v1Data.types";

type ProjectConfig = Override<
  Omit<V1.ProjectConfig, "multiScreen">,
  {
    screenConfig: V1.ScreenConfigData;
    runtimePlugins: string[];
  }
>;

type Output = string | null;

type Node<N extends { type: V1.Node["type"] }> = Omit<N, "type"> & { nodeType: N["type"] };

type Branch = Override<
  Node<V1.Branch>,
  {
    trueOutput: Output;
    falseOutput: Output;
    valueA: string;
    valueB: string;
  }
>;

type Entry = Override<
  Omit<Node<V1.Entry>, "entryType">,
  {
    output: Output;
  } & EntryTypePayload
>;

type Sequence = Override<
  Node<V1.Sequence>,
  {
    steps: string[];
    output: Output;
  }
>;

type VariableSet = Override<
  Node<V1.VariableSet>,
  {
    value: string;
    output: Output;
  }
>;

type AllNode = Entry | Sequence | Branch | VariableSet;

type Step = Override<V1.Step, StepTypePayload>;

type Component = Override<
  V1.Component,
  {
    elements: string[];
    frame: string | null;
    introTransition: Transition;
    outroTransition: Transition;
  }
>;

type Transition = Override<
  V1.Transition,
  {
    plugin: string | null;
  }
>;

type Element = Override<
  V1.Element,
  {
    listeners: string[];
  } & ElementTypePayload
>;

type Listener = Override<
  V1.Listener,
  {
    output: Output;
  } & ListenerTypePayload
>;

type Value = Override<
  V1.Value,
  {
    process: string[];
  }
>;

type ValueProcess = {
  id: string;
} & ValueProcessTypePayload;

type Data = {
  version: 2;
  appVersion: string;
  config: ProjectConfig;
  resources: Record<string, V1.Resource>;
  variables: Record<string, V1.Variable>;
  nodes: Record<string, AllNode>;
  steps: Record<string, Step>;
  components: Record<string, Component>;
  elements: Record<string, Element>;
  listeners: Record<string, Listener>;
  valueProcesses: Record<string, ValueProcess>;
  pluginPointers: Record<string, V1.PluginPointer>;
  values: Record<string, Value>;
  viewport: V1.ViewportData;
  updatedAt: number;
};

export * from "./v1Data.types";
export type {
  ProjectConfig,
  Data,
  Branch,
  Entry,
  Sequence,
  VariableSet,
  AllNode as Node,
  Step,
  Component,
  Element,
  Listener,
  Value,
  ValueProcess,
  Transition
};
