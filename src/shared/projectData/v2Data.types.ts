import type {
    ElementTypePayload,
    EntryTypePayload,
    ListenerTypePayload,
    StepTypePayload,
    ValueProcessTypePayload
} from "./typePayloadTemplate/types";
import type * as V1 from "./v1Data.types";

type ProjectConfig = Omit<V1.ProjectConfig, "runtimePlugins"> & {
    runtimePlugins?: string[];
};

type Output = string | null;

type Branch = Omit<V1.Branch, "trueOutput" | "falseOutput" | "valueA" | "valueB"> & {
    trueOutput: Output;
    falseOutput: Output;
    valueA: string;
    valueB: string;
};

type Entry = V1.NodeBase & {
    type: "entry";
    output: Output;
} & EntryTypePayload;

type Sequence = Omit<V1.Sequence, "steps" | "output"> & {
    steps: string[];
    output: Output;
};

type VariableSet = Omit<V1.VariableSet, "value" | "output"> & {
    value: string;
    output: Output;
};

type AllNode = Entry | Sequence | Branch | VariableSet;

type Step = {
    id: string;
    title: null | string;
} & StepTypePayload;

type Component = {
    id: string;
    elements: string[];
    frame: string | null;
    introTransition: Transition;
    outroTransition: Transition;
    [key: string]: any;
};

type Transition = {
    duration: number;
    delay: number;
    easing: string;
    plugin: string | null;
};

type Element = {
    id: string;
    listeners: string[];
    [key: string]: any;
} & ElementTypePayload;

type Listener = {
    id: string;
    output: Output;
    [key: string]: any;
} & ListenerTypePayload;

type Value = Omit<V1.Value, "process"> & {
    process: string[];
};

type ValueProcess = {
    id: string;
} & ValueProcessTypePayload;

type PluginPointer = V1.PluginPointer;

interface Data {
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
    pluginPointers: Record<string, PluginPointer>;
    values: Record<string, Value>;
    updatedAt?: number;
}

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
    PluginPointer
};
