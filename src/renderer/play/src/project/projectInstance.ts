import type { RuntimeProjectData, Types } from "@shared/projectData/types";
import { Entry } from "./nodes/entry";
import { Sequence } from "./nodes/sequence";
import { Branch } from "./nodes/branch";
import { VariableSet } from "./nodes/variableSet";
import { StandbyEntry } from "./nodes/standbyEntry";
import { registerVariables } from "../lib/variables";
import { Value } from "./value";
import { updateRefProject } from "./refs";
import { Resource } from "./resource";

const NodeClasses = {
  entry: Entry,
  sequence: Sequence,
  branch: Branch,
  variableSet: VariableSet
} as const;
type NodeInstance = InstanceType<(typeof NodeClasses)[keyof typeof NodeClasses]>;

export class Project {
  readonly nodes: Map<string, NodeInstance> = new Map();
  readonly n: {
    entry: (Entry | StandbyEntry)[];
    sequence: Sequence[];
    branch: Branch[];
    variableSet: VariableSet[];
  } = {
    entry: [],
    sequence: [],
    branch: [],
    variableSet: []
  };
  readonly values: Map<string, Value> = new Map();
  readonly resources: Map<string, Resource> = new Map();
  constructor(readonly data: RuntimeProjectData) {
    data.nodes.forEach((nn) => {
      const obj = new (
        nn.nodeType === "entry" && nn.standbyMode ? StandbyEntry : NodeClasses[nn.nodeType]
      )(nn as any);
      this.n[nn.nodeType].push(obj as any);
      this.nodes.set(nn.id, obj);
    });
    this.values = new Map(data.values.entries().map(([id, v]) => [id, new Value(v)]));
    this.resources = new Map(
      data.resources.values().map((resource) => [resource.id, new Resource(resource)])
    );
    registerVariables(data.variables);
    updateRefProject(this);
  }

  goto(id: string) {
    this.nodes.get(id)?.execute();
  }
  findAllEntries<
    T extends Types.Entry["type"],
    E extends Extract<Types.Entry, { type: T }>["payload"]
  >(entryType: T, data?: Partial<E>): Entry[] {
    return this.n.entry.filter(({ d: entryData }) => {
      if (entryType !== entryData.type) return false;
      if (typeof entryData.payload !== "object" || !entryData.payload || !data) return true;

      if (
        entryData.type === "Communication.serialData" &&
        !entryData.payload.whenDataIs?.length
      )
        return true;

      if (
        entryData.type === "Communication.Socket.ondata" &&
        "channel" in data &&
        entryData.payload.channel === data.channel &&
        !entryData.payload.data
      )
        return true;

      return Object.entries(entryData.payload).every(([key, value]) => {
        const expectedValue = data[key as keyof typeof data];

        if (typeof value === "string" && typeof expectedValue === "string") {
          return value.trim() === expectedValue.trim();
        }

        return Object.is(value, expectedValue);
      });
    });
  }
  enterEntries<
    T extends Types.Entry["type"],
    E extends Extract<Types.Entry, { type: T }>["payload"]
  >(entryType: T, data?: Partial<E>) {
    const entries = this.findAllEntries(entryType, data as any);
    entries.forEach((entry) => {
      entry.enter();
    });
  }
  resetEntries() {
    this.n.entry.forEach((e) => {
      if (e.d.standbyMode) (e as StandbyEntry).disable();
    });
  }

  findResourceByTitle(resourceTitle: string) {
    return this.resources.values().find((r) => r.title === resourceTitle);
  }
}
