import { addHistory } from "../lib/editUtils/history";
import { SvelteMap } from "svelte/reactivity";

import type { RuntimeProjectData, Types } from "@shared/projectData/types";
import type { Entries, ValueOf } from "@shared/utils.types";
import type { PROJECT_RECORDS } from "@shared/constants";
import { genId } from "@shared/genId";
import { getConnectedOutputs, setAllOutput } from "../nodes/lines/output";
import type { RecordKey, RecordValue } from "@shared/constants";

type MapToSvelteMap<T> = {
  readonly [K in keyof T]: T[K] extends Map<infer MK, infer MV> ? SvelteMap<MK, MV> : T[K];
};
type SvelteProject = MapToSvelteMap<RuntimeProjectData>;

function entriesOf<T extends object>(obj: T) {
  return Object.entries(obj) as Entries<T>;
}
function assignProjectData(target: SvelteProject, data: RuntimeProjectData) {
  for (const [key, value] of entriesOf(data)) {
    //@ts-expect-error
    target[key] = (
      value instanceof Map
        ? new SvelteMap(
            //@ts-expect-error
            value
          )
        : value
    ) as SvelteProject[typeof key];
  }
}

type ProjectRecord<K extends RecordKey> = SvelteMap<string, RecordValue<K>>;

export interface ProjectInstance extends SvelteProject {}
export class ProjectInstance {
  constructor(data: RuntimeProjectData) {
    assignProjectData(this, data);
  }
  private record<K extends RecordKey>(type: K): ProjectRecord<K> {
    return this[type] as ProjectRecord<K>;
  }
  add<T extends RecordKey>(
    type: T,
    target: RecordValue<T>,
    id: string = "id" in target ? target.id : genId(),
    afterChange?: () => unknown
  ): string {
    const record = this.record(type);

    addHistory({
      doFn: () => {
        record.set(id, target);
      },
      undoFn: () => {
        record.delete(id);
      },
      afterChange
    });
    return id;
  }
  delete<T extends RecordKey>(type: T, target: RecordValue<T>, afterChange?: () => unknown): void;
  delete(type: RecordKey, id: string, afterChange?: () => unknown): void;
  delete<T extends RecordKey>(
    type: T,
    data: string | RecordValue<T>,
    afterChange?: () => unknown
  ): void {
    try {
      const [id, target]: [string, RecordValue<T>] =
        typeof data === "string"
          ? [data, this.getUnsafe(type, data)]
          : [this.getIdFromData(type, data, true), data];
      if (type === "nodes") return this.removeNode(target as Types.Node, afterChange);

      const record = this.record(type);

      addHistory({
        doFn: () => {
          record.delete(id);
        },
        undoFn: () => {
          record.set(id, target);
        },
        afterChange
      });
    } catch (err) {
      console.error(err);
      return;
    }
  }
  getUnsafe<T extends RecordKey>(type: T, id: string) {
    const r = this.record(type).get(id) as RecordValue<T>;
    if (r === undefined) throw new Error(`There is no ${type} with id "${id}".`);
    return r;
  }
  getArrUnsafe<T extends RecordKey>(type: T, arr: string[]) {
    return arr.map((id) => this.getUnsafe(type, id));
  }
  getIdFromData<T extends RecordKey>(
    type: T,
    target: RecordValue<T>,
    unsafe?: false
  ): string | undefined;
  getIdFromData<T extends RecordKey>(type: T, target: RecordValue<T>, unsafe: true): string;
  getIdFromData<T extends RecordKey>(type: T, target: RecordValue<T>, unsafe = false) {
    if ("id" in target) return target.id;

    const entries = this.record(type).entries();
    for (const [id, t] of entries) {
      if (t === target) return id;
    }
    if (unsafe) {
      throw new Error(`Cannot get ID of unregistered ${type} data.`);
    }

    return undefined;
  }
  removeNode(node: Types.Node, afterChange?: () => unknown) {
    const connectedOutputs = getConnectedOutputs(node.id);
    addHistory({
      doFn: ({ id, connectedOutputs }) => {
        this.nodes.delete(id);
        setAllOutput(connectedOutputs, null);
      },
      undoFn: ({ node, connectedOutputs }) => {
        this.nodes.set(node.id, node);
        setAllOutput(connectedOutputs, node.id);
      },
      doData: { id: node.id, connectedOutputs },
      undoData: { node, connectedOutputs },
      afterChange
    });
  }
  removeManyNode(nodes: Types.Node[], afterChange?: () => unknown) {
    const connectedOutputs = nodes.map((node) => getConnectedOutputs(node.id));
    addHistory({
      doFn: ({ nodes, connectedOutputs }) => {
        nodes.forEach(({ id }, i) => {
          this.nodes.delete(id);
          setAllOutput(connectedOutputs[i], null);
        });
      },
      undoFn: ({ nodes, connectedOutputs }) => {
        nodes.forEach((node, i) => {
          this.nodes.set(node.id, node);
          setAllOutput(connectedOutputs[i], node.id);
        });
      },
      doData: { nodes, connectedOutputs },
      undoData: { nodes, connectedOutputs },
      afterChange
    });
  }
}
