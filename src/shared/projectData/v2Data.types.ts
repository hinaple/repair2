import type { ScreenConfigStoreData } from "./projectConfig.types";
import type {
    ElementTypePayload,
    EntryTypePayload,
    ListenerTypePayload,
    StepTypePayload,
    ValueProcessTypePayload
} from "./typePayloadTemplate/types";
import type { Override } from "./utils.types";
import type * as V1 from "./v1Data.types";

type ProjectConfig = Override<
    Omit<V1.ProjectConfig, "multiScreen">,
    {
        screenConfig: ScreenConfigStoreData;
        runtimePlugins?: string[];
    }
>;

type Output = string | null;

type Branch = Override<
    V1.Branch,
    {
        trueOutput: Output;
        falseOutput: Output;
        valueA: string;
        valueB: string;
    }
>;

type Entry = Override<
    V1.Entry,
    {
        output: Output;
    } & EntryTypePayload
>;

type Sequence = Override<
    V1.Sequence,
    {
        steps: string[];
        output: Output;
    }
>;

type VariableSet = Override<
    V1.VariableSet,
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

type PluginPointer = V1.PluginPointer;
type Resource = V1.Resource;
type Variable = V1.Variable;

interface Data {
    version: 2;
    appVersion: string;
    config: ProjectConfig;
    resources: Record<string, Resource>;
    variables: Record<string, Variable>;
    nodes: Record<string, AllNode>;
    steps: Record<string, Step>;
    components: Record<string, Component>;
    elements: Record<string, Element>;
    listeners: Record<string, Listener>;
    valueProcesses: Record<string, ValueProcess>;
    pluginPointers: Record<string, PluginPointer>;
    values: Record<string, Value>;
    updatedAt: number;
}

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
    PluginPointer,
    Resource,
    Variable,
    Transition
};
