import { getVariable, type RuntimeVariableData } from "../lib/variables";
import type { Types } from "@shared/projectData/types";
import type { NodeController } from "./types";
import type { Project } from "./projectInstance";
import type { Value } from "./value";
import type { ValidPluginPointer } from "../lib/plugin/types";
import type { Resource } from "./resource";

type RefMap = {
    resources: Resource;
    variables: RuntimeVariableData;
    nodes: NodeController;
    steps: Types.Step;
    components: Types.Component;
    elements: Types.Element;
    listeners: Types.Listener;
    valueProcesses: Types.ValueProcess;
    pluginPointers: ValidPluginPointer;
    values: Value;
};

export type Ref<T extends keyof RefMap> = () => RefMap[T] | undefined;

let lastProject: Project;

export function ref<T extends keyof RefMap>(type: T, id: string): Ref<T> {
    return () => getRef(type, id);
}

function getRefObj(
    type: keyof RefMap,
    id: string,
    project: Project
): RefMap[typeof type] | undefined {
    if (type === "nodes") return project.nodes.get(id);
    if (type === "variables") return getVariable(id);
    if (type === "values") return project.values.get(id);
    if (type === "resources") return project.resources.get(id);
    if (type === "pluginPointers") {
        const pp = project.data.pluginPointers.get(id);
        if (!pp || !pp.name) return;
        return pp as ValidPluginPointer;
    }

    return project.data[type].get(id);
}

export function getRef<T extends keyof RefMap>(type: T, id: string, safe: false): RefMap[T];
export function getRef<T extends keyof RefMap>(
    type: T,
    id: string,
    safe?: boolean
): RefMap[T] | undefined;
export function getRef(
    type: keyof RefMap,
    id: string,
    safe: boolean = true,
    project: Project = lastProject
): RefMap[keyof RefMap] | undefined {
    const ref = getRefObj(type, id, project);
    if (!safe && !ref) throw new Error(`Cannot access to ${type}:${id}.`);

    return ref;
}

export function updateRefProject(project: Project) {
    lastProject = project;
}
