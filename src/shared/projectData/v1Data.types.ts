import type { ScreenConfigStoreData } from "./projectConfig.types";

type ProjectConfig = {
  title: string;
  width: number | null;
  height: number | null;
  sizeRatio: string | number | null;
  filter: string | null;
  style: string | null;
  editorShortcut: string | null;
  editorPassword: string | null;
  transparent: boolean;
  alwaysOnTop: boolean;
  devMode: boolean;
  suppressGlobalKeys: boolean;
  runtimePlugins: PluginPointer[];
} & (
  | {
      multiScreen: boolean;
    }
  | {
      screenConfig: ScreenConfigStoreData;
    }
);

type Node = {
  type: string;
  id: string;
  alias: string | null;
  nodePos: { x: number; y: number };
};

type AdvancedNode = Node & {
  folded: boolean;
  inputColor: string;
};

type Branch = Node & {
  type: "branch";
  trueOutput: Output;
  falseOutput: Output;
  valueA: Value;
  valueB: Value;
  operator: "equals" | "includes" | "gt" | "lt" | "gte" | "lte" | "jsFunction";
  scriptData: string | null;
  disableAfterTrue: boolean;
  disableAfterFalse: boolean;
};

type Entry = Node & {
  type: "entry";
  output: Output;
  entryType: string[] | string;
  payload: any;
  standbyMode: boolean;
};

type Sequence = AdvancedNode & {
  type: "sequence";
  steps: Step[];
  output: Output;
};

type VariableSet = AdvancedNode & {
  type: "variableSet";
  variable: string | null;
  value: Value;
  output: Output;
};

type AllNode = Entry | Sequence | Branch | VariableSet;

type Step = {
  id: string;
  title: string | null;
} & (
  | {
      type: ["Component", "create"];
      payload: Component;
    }
  | {
      type: ["Others", "executePlugin"];
      payload: { plugin: PluginPointer; waitTillEnd: boolean };
    }
  | {
      type: string[];
      payload: any;
    }
);

type Position = {
  distance: number | null;
  origin: "start" | "center" | "end";
  relative: boolean;
};

type Coord = {
  x: Position;
  y: Position;
};

type Component = {
  id: string;
  alias: string | null;
  zIndex: number | null;
  pos: Coord;
  unbreakable: boolean;
  visible: boolean;
  style: string | null;
  elements: Element[];
  frame: PluginPointer;
  introTransition: Transition;
  outroTransition: Transition;
};

type Transition = {
  duration: number;
  delay: number;
  easing: string;
  plugin: PluginPointer;
};

type EnabledDragOption = {
  use: true;
  returnOnRelease: boolean;
  returnDuration: number;
  hotspots: Coord[];
  threshold: number;
  snapOn: "never" | "drag" | "release";
  snapDuration: number;
  moveEasing: string;
};

type DragOption = EnabledDragOption | { use?: false };

type Element = {
  id: string;
  alias: string | null;
  width: number | null;
  height: number | null;
  style: string | null;
  childStyle: string | null;
  className: string | null;
  pos: Coord;
  absolute: boolean;
  fullscreen: boolean;
  listeners: Listener[];
  dragOption: DragOption;
} & (
  | {
      type: ["plugin"];
      payload: PluginPointer;
    }
  | {
      type: string[];
      payload: Record<string, boolean | string | number | null | undefined>;
    }
);

type Listener = {
  id: string;
  output: Output;
  repeatCount: number;
  repeatInterval: number;
  once: boolean;
  global: boolean;
  useCapture: boolean;
} & (
  | {
      type: ["plugin"];
      payload: { plugin: PluginPointer; channel: string };
    }
  | {
      type: string[];
      payload: Record<string, boolean | string | number | null | undefined>;
    }
);

type Value = {
  baseType: string;
  baseValue: string | null;
  process: ValueProcess[];
};

type ValueProcess = {
  [key: string]: any;
};

type Output = {
  to: null | string;
};

type Resource = {
  id: string;
  src: string | null;
  alias: string | null;
};

type Variable = {
  id: string;
  name: string | null;
  defaultValue: string | null;
};

type PluginPointer = {
  name: string | null;
  exportName: string | null;
  payloads: Record<string, string>;
};

type Data = {
  VERSION?: string;
  config: ProjectConfig;
  resources: Resource[];
  variables: Variable[];
  nodes: AllNode[];
  updatedAt?: number;
};

export type {
  Node as NodeBase,
  AdvancedNode,
  ProjectConfig,
  Data,
  Branch,
  Entry,
  Sequence,
  VariableSet,
  AllNode as Node,
  Step,
  Position,
  Coord,
  Component,
  DragOption,
  Element,
  Listener,
  Value,
  ValueProcess,
  Output,
  Resource,
  Variable,
  PluginPointer,
  Transition
};
