import type { ScreenConfigStoreData } from "./projectConfig.types";

type ProjectConfig = {
    title?: string;
    width?: number | null;
    height?: number | null;
    sizeRatio?: string | number | null;
    filter?: string | null;
    style?: string | null;
    editorShortcut?: string | null;
    editorPassword?: string | null;
    screenConfig?: ScreenConfigStoreData;
    multiScreen?: boolean;
    transparent?: boolean;
    alwaysOnTop?: boolean;
    devMode?: boolean;
    suppressGlobalKeys?: boolean;
    runtimePlugins?: PluginPointer[];
};

interface Node {
    id: string;
    alias: null | string;
    nodePos: { x: number; y: number };
}

interface AdvancedNode extends Node {
    folded: boolean;
    inputColor: string;
}

interface Branch extends Node {
    type: "branch";
    trueOutput: Output;
    falseOutput: Output;
    valueA: Value;
    valueB: Value;
}

interface Entry extends Node {
    type: "entry";
    output: Output;
    entryType: string[] | string;
    payload: any;
    [key: string]: any;
}

interface Sequence extends AdvancedNode {
    type: "sequence";
    steps: Step[];
    output: Output;
}

interface VariableSet extends AdvancedNode {
    type: "variableSet";
    value: Value;
    output: Output;
}

type AllNode = Entry | Sequence | Branch | VariableSet;

type Step = {
    id: string;
    title: null | string;
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

interface Component {
    id: string;
    elements: Element[];
    frame: PluginPointer;
    introTransition: Transition;
    outroTransition: Transition;
    [key: string]: any;
}

interface Transition {
    duration: number;
    delay: number;
    easing: string;
    plugin: PluginPointer;
}

type Element = {
    id: string;
    listeners: Listener[];
    [key: string]: any;
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
    output: Output;
    [key: string]: any;
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

interface Value {
    baseType: string;
    baseValue: string | null;
    process: ValueProcess[];
}

interface ValueProcess {
    [key: string]: any;
}

interface Output {
    to: null | string;
}

interface Resource {
    id: string;
    src: string;
    alias: string | null;
}

interface Variable {
    id: string;
    name: string | null;
    defaultValue: string | null;
}

type PluginPointer = {
    name: string | null;
    exportName: string | null;
    payloads: Record<string, string>;
};

interface Data {
    VERSION: string;
    config: ProjectConfig;
    resources: Resource[];
    variables: Variable[];
    nodes: AllNode[];
    updatedAt?: number;
}

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
    Component,
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
