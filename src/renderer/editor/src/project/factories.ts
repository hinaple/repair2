import type { RecordKey, RecordValue } from "@shared/constants";
import {
  createComponent,
  createBranch,
  createElement,
  createEntry,
  createListener,
  createPluginPointer,
  createResource,
  createSequence,
  createStep,
  createValue,
  createValueProcess,
  createVariableSet,
  createVariable
} from "@shared/projectData/factories";
import type { RegisterOwned } from "@shared/projectData/factories/factory";
import { genId } from "@shared/genId";
import { getMutator } from "./store";

function recordId(data: object): string {
  return "id" in data && typeof data.id === "string" ? data.id : genId();
}

type DefaultFactory<K extends RecordKey> = (
  overrides: undefined,
  registerOwned: RegisterOwned
) => RecordValue<K>;

function createEditorFactory<K extends RecordKey>(
  type: K,
  factory: DefaultFactory<K>
): () => string {
  return () => {
    const mutator = getMutator();
    return mutator.transaction(() => {
      const registerOwned: RegisterOwned = (ownedType, data) => {
        const id = recordId(data);
        return mutator.add(ownedType, id, data);
      };

      const data = factory(undefined, registerOwned);
      const id = recordId(data);
      return mutator.add(type, id, data);
    });
  };
}

type NodeData = RecordValue<"nodes">;
type NodePosition = NodeData["nodePos"];

function createEditorNodeFactory<T extends NodeData>(
  factory: (overrides: { nodePos: NodePosition }, registerOwned: RegisterOwned) => T
): (nodePos: NodePosition) => string {
  return (nodePos) => {
    const mutator = getMutator();
    return mutator.transaction(() => {
      const registerOwned: RegisterOwned = (ownedType, data) => {
        const id = recordId(data);
        return mutator.add(ownedType, id, data);
      };

      const data = factory({ nodePos }, registerOwned);
      return mutator.add("nodes", data.id, data);
    });
  };
}

export const Factories = {
  resource: createEditorFactory("resources", createResource),
  variable: createEditorFactory("variables", createVariable),
  node: {
    entry: createEditorNodeFactory(createEntry),
    sequence: createEditorNodeFactory(createSequence),
    branch: createEditorNodeFactory(createBranch),
    variableSet: createEditorNodeFactory(createVariableSet)
  },
  step: createEditorFactory("steps", createStep),
  component: createEditorFactory("components", createComponent),
  element: createEditorFactory("elements", createElement),
  listener: createEditorFactory("listeners", createListener),
  valueProcess: createEditorFactory("valueProcesses", createValueProcess),
  pluginPointer: createEditorFactory("pluginPointers", createPluginPointer),
  value: createEditorFactory("values", createValue)
} as const;
