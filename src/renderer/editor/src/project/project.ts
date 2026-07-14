import { SvelteMap } from "svelte/reactivity";

import type { RuntimeProjectData, Types } from "@shared/projectData/types";
import type { Entries } from "@shared/utils.types";
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
  get<T extends RecordKey>(type: T, id: string): RecordValue<T> | undefined {
    return this.record(type).get(id) as RecordValue<T> | undefined;
  }
  /** Mutation primitive. Editor code should use ProjectMutator instead. */
  setRecord<T extends RecordKey>(type: T, id: string, value: RecordValue<T>): void {
    this.record(type).set(id, value);
  }
  /** Mutation primitive. Editor code should use ProjectMutator instead. */
  deleteRecord<T extends RecordKey>(type: T, id: string): boolean {
    return this.record(type).delete(id);
  }
  /** Mutation primitive. Editor code should use ProjectMutator instead. */
  setConfig(value: Types.ProjectConfig): void {
    Object.defineProperty(this, "config", {
      value,
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
  /** UI-only viewport state is snapshotted into project data at the save boundary. */
  setViewport(value: Types.ViewportData): void {
    Object.defineProperty(this, "viewport", {
      value,
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
  getUnsafe<T extends RecordKey>(type: T, id: string) {
    const r = this.get(type, id);
    if (r === undefined) throw new Error(`There is no ${type} with id "${id}".`);
    return r;
  }
  getArrUnsafe<T extends RecordKey>(type: T, arr: string[]) {
    return arr.map((id) => this.getUnsafe(type, id));
  }
}
