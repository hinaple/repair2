import { addHistory } from "../../lib/workHistory";
import { SvelteMap } from "svelte/reactivity";

import type { RuntimeProjectData, Types } from "@shared/projectData/types";
import type { Entries, ValueOf } from "@shared/utils.types";
import type { PROJECT_RECORDS } from "@shared/constants";
import { genId } from "@shared/genId";
import { getConnectedOutputs, setAllOutput } from "../../nodes/lines/output";

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

type RecordKey = (typeof PROJECT_RECORDS)[number];
type RecordValue<K extends RecordKey> = ValueOf<Types.Data[K]>;
type ProjectRecord<K extends RecordKey> = SvelteMap<string, RecordValue<K>>;

export interface Project extends SvelteProject {}
export class Project {
  constructor(data: RuntimeProjectData) {
    assignProjectData(this, data);
  }
  private record<K extends RecordKey>(type: K): ProjectRecord<K> {
    return this[type] as ProjectRecord<K>;
  }
  add<T extends RecordKey>(
    type: T,
    target: RecordValue<T>,
    id: string = "id" in target ? target.id : genId()
  ): string {
    const record = this.record(type);

    addHistory({
      doFn: () => {
        record.set(id, target);
      },
      undoFn: () => {
        record.delete(id);
      }
    });
    return id;
  }
  delete<T extends RecordKey>(type: T, target: RecordValue<T>): void;
  delete(type: RecordKey, id: string): void;
  delete<T extends RecordKey>(type: T, data: string | RecordValue<T>): void {
    try {
      const [id, target]: [string, RecordValue<T>] =
        typeof data === "string"
          ? [data, this.getUnsafe(type, data)]
          : [this.getIdFromData(type, data, true), data];
      const record = this.record(type);

      addHistory({
        doFn: () => {
          record.delete(id);
        },
        undoFn: () => {
          record.set(id, target);
        }
      });
    } catch (err) {
      console.error(err);
      return;
    }
  }
  getUnsafe<T extends RecordKey>(type: T, id: string) {
    const r = this.record(type).get(id) as RecordValue<T>;
    if (r === undefined) throw new Error(`There is no data with id "${id}" in ${type}.`);
    return r;
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
  deleteNode(node: Types.Node) {
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
      undoData: { node, connectedOutputs }
    });
  }
  deleteManyNode(nodes: Types.Node[]) {
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
      undoData: { nodes, connectedOutputs }
    });
  }
  // get nodeConnects() {
  //   const connects = new Map(
  //     this.nodes.values().map((n) => [
  //       n.id,
  //       {
  //         ins: new Set(),
  //         outs: new Set((n.outputs ?? [n.output])?.map((o) => o.to).filter(Boolean) ?? [])
  //       }
  //     ])
  //   );
  //   connects.forEach((c, id) => {
  //     c.outs.forEach((o) => connects.get(o).ins.add(id));
  //   });
  //   return connects;
  // }
}
