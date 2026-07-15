import { SvelteMap } from "svelte/reactivity";
import { untrack } from "svelte";

import type { RecordKey, RecordValue } from "@shared/constants";
import type { ProjectConfig } from "@shared/projectData/types";
import { deepForEach } from "@shared/projectData/relation";
import {
  addPatchHistory,
  beginPendingHistoryChange,
  type HistoryDirection
} from "../lib/editUtils/history";
import type { ProjectInstance } from "./project";

export type MutationPath = readonly (string | number)[];

export type MutationTarget = { kind: "record"; type: RecordKey; id: string } | { kind: "config" };

export type ProjectPatch =
  | {
      kind: "set";
      target: MutationTarget;
      path: MutationPath;
      before: unknown;
      after: unknown;
    }
  | {
      kind: "splice";
      target: MutationTarget;
      path: MutationPath;
      index: number;
      removed: readonly unknown[];
      inserted: readonly unknown[];
    }
  | {
      kind: "move";
      target: MutationTarget;
      path: MutationPath;
      from: number;
      to: number;
    }
  | {
      kind: "addRecord" | "deleteRecord";
      target: Extract<MutationTarget, { kind: "record" }>;
      data: RecordValue;
    };

export type ProjectChange = {
  target: MutationTarget;
  operation: ProjectPatch["kind"];
  path: MutationPath;
  direction: HistoryDirection | "transient";
};

export interface EditSession<T> {
  update(value: T): void;
  commit(): void;
  cancel(): void;
}

export interface FieldBinding<T = unknown> {
  readonly target: MutationTarget;
  readonly path: MutationPath;
  readonly value: T;
  set(value: T): void;
  setTransient(value: T): void;
  begin(): EditSession<T>;
  at<U = unknown>(...path: MutationPath): Binding<U>;
}

export interface ArrayFieldBinding<Item> extends FieldBinding<Item[]> {
  at(index: number): Binding<Item>;
  at<U = unknown>(...path: MutationPath): Binding<U>;
  splice(index: number, deleteCount: number, ...inserted: Item[]): void;
  move(from: number, to: number): void;
}

export type Binding<T> = [T] extends [(infer Item)[]] ? ArrayFieldBinding<Item> : FieldBinding<T>;

type ChangeListener = (change: ProjectChange) => unknown;

function targetKey(target: MutationTarget) {
  return target.kind === "config" ? "config" : `${target.type}:${target.id}`;
}

function valueAtPath(root: unknown, path: MutationPath): unknown {
  let value = root;
  for (const key of path) value = (value as Record<string | number, unknown>)[key];
  return value;
}

function replaceAtPath(root: unknown, path: MutationPath, value: unknown): unknown {
  if (path.length === 0) return value;
  const [key, ...rest] = path;
  const container = Array.isArray(root)
    ? [...root]
    : { ...(root as Record<string | number, unknown>) };
  container[key as keyof typeof container] = replaceAtPath(
    (root as Record<string | number, unknown>)[key],
    rest,
    value
  ) as never;
  return container;
}

function moveItem<T>(array: readonly T[], from: number, to: number): T[] {
  const next = [...array];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export class ProjectMutator {
  private readonly revisions = new SvelteMap<string, number>();
  private readonly listeners = new Map<string, Set<ChangeListener>>();
  private readonly activeSessions = new Set<EditSession<unknown>>();
  private transactionDepth = 0;
  private transactionPatches: ProjectPatch[] | null = null;

  constructor(private readonly project: ProjectInstance) {}

  record<K extends RecordKey, T extends RecordValue<K> = RecordValue<K>>(
    type: K,
    id: string
  ): RecordEditor<K, T> {
    return new RecordEditor(this, type, id);
  }

  config(): ConfigEditor {
    return new ConfigEditor(this);
  }

  subscribe(target: MutationTarget, listener: ChangeListener): () => void {
    const key = targetKey(target);
    let listeners = this.listeners.get(key);
    if (!listeners) this.listeners.set(key, (listeners = new Set()));
    listeners.add(listener);
    return () => {
      listeners!.delete(listener);
      if (listeners!.size === 0) this.listeners.delete(key);
    };
  }

  read(target: MutationTarget): unknown {
    this.revisions.get(targetKey(target));
    return target.kind === "config"
      ? this.project.config
      : untrack(() => this.project.getUnsafe(target.type, target.id));
  }

  readPath<T>(target: MutationTarget, path: MutationPath): T {
    return valueAtPath(this.read(target), path) as T;
  }

  set(target: MutationTarget, path: MutationPath, value: unknown): void {
    const before = this.readPath(target, path);
    if (Object.is(before, value)) return;
    this.perform({ kind: "set", target, path: [...path], before, after: value });
  }

  setTransient(target: MutationTarget, path: MutationPath, value: unknown): void {
    const before = this.readPath(target, path);
    if (Object.is(before, value)) return;
    this.applyPatch(
      { kind: "set", target, path: [...path], before, after: value },
      "forward",
      true
    );
  }

  beginSet<T>(target: MutationTarget, path: MutationPath): EditSession<T> {
    const before = this.readPath<T>(target, path);
    let after = before;
    let finished = false;
    const pendingChange = beginPendingHistoryChange();
    const session: EditSession<T> = {
      update: (value) => {
        if (finished || Object.is(after, value)) return;
        this.setTransient(target, path, value);
        after = value;
        pendingChange.setDirty(!Object.is(before, after));
      },
      commit: () => {
        if (finished) return;
        finished = true;
        this.activeSessions.delete(session as EditSession<unknown>);
        try {
          if (!Object.is(before, after))
            this.recordApplied([{ kind: "set", target, path: [...path], before, after }]);
        } finally {
          pendingChange.finish();
        }
      },
      cancel: () => {
        if (finished) return;
        finished = true;
        this.activeSessions.delete(session as EditSession<unknown>);
        try {
          if (!Object.is(before, after)) {
            this.applyPatch(
              { kind: "set", target, path: [...path], before, after },
              "backward",
              true
            );
          }
        } finally {
          pendingChange.finish();
        }
      }
    };
    this.activeSessions.add(session as EditSession<unknown>);
    return session;
  }

  commitPendingEdits(): void {
    for (const session of [...this.activeSessions]) session.commit();
  }

  splice(
    target: MutationTarget,
    path: MutationPath,
    index: number,
    deleteCount: number,
    ...inserted: unknown[]
  ): void {
    const array = this.readPath<unknown[]>(target, path);
    const safeIndex = index < 0 ? Math.max(0, array.length + index) : Math.min(index, array.length);
    const removed = array.slice(safeIndex, safeIndex + deleteCount);
    if (removed.length === 0 && inserted.length === 0) return;
    this.perform({
      kind: "splice",
      target,
      path: [...path],
      index: safeIndex,
      removed,
      inserted
    });
  }

  move(target: MutationTarget, path: MutationPath, from: number, to: number): void {
    if (from === to) return;
    this.perform({ kind: "move", target, path: [...path], from, to });
  }

  add<K extends RecordKey>(type: K, id: string, data: RecordValue<K>): string {
    if (this.project.get(type, id)) throw new Error(`${type}:${id} already exists.`);
    this.perform({
      kind: "addRecord",
      target: { kind: "record", type, id },
      data
    });
    return id;
  }

  delete<K extends RecordKey>(type: K, id: string): RecordValue<K> {
    const data = this.project.getUnsafe(type, id);
    this.perform({
      kind: "deleteRecord",
      target: { kind: "record", type, id },
      data
    });
    return data;
  }

  deleteTree(type: RecordKey, id: string): void {
    this.transaction(() => {
      const targets: { type: RecordKey; id: string; level: number }[] = [];
      deepForEach(
        this.project,
        type,
        id,
        ({ type, id, level }) => targets.push({ type, id, level }),
        { onlyOwns: true }
      );
      for (const target of targets.toSorted((a, b) => b.level - a.level)) {
        if (this.project.get(target.type, target.id)) this.delete(target.type, target.id);
      }
    });
  }

  disconnectOutputsTo(nodeId: string): void {
    this.transaction(() => {
      for (const [id, node] of this.project.nodes) {
        if (node.nodeType === "branch") {
          if (node.trueOutput === nodeId)
            this.set({ kind: "record", type: "nodes", id }, ["trueOutput"], null);
          if (node.falseOutput === nodeId)
            this.set({ kind: "record", type: "nodes", id }, ["falseOutput"], null);
        } else if (node.output === nodeId) {
          this.set({ kind: "record", type: "nodes", id }, ["output"], null);
        }
      }
      for (const [id, listener] of this.project.listeners) {
        if (listener.output === nodeId)
          this.set({ kind: "record", type: "listeners", id }, ["output"], null);
      }
    });
  }

  transaction<T>(callback: () => T): T {
    const outermost = this.transactionDepth === 0;
    if (outermost) this.transactionPatches = [];
    this.transactionDepth++;
    try {
      return callback();
    } catch (error) {
      if (outermost && this.transactionPatches) {
        for (let i = this.transactionPatches.length - 1; i >= 0; i--)
          this.applyPatch(this.transactionPatches[i], "backward");
        this.transactionPatches = [];
      }
      throw error;
    } finally {
      this.transactionDepth--;
      if (outermost) {
        const patches = this.transactionPatches ?? [];
        this.transactionPatches = null;
        if (patches.length) this.recordApplied(patches);
      }
    }
  }

  private perform(patch: ProjectPatch) {
    this.applyPatch(patch, "forward");
    if (this.transactionPatches) this.appendTransactionPatch(patch);
    else this.recordApplied([patch]);
  }

  private appendTransactionPatch(patch: ProjectPatch) {
    if (patch.kind === "set") {
      const existing = this.transactionPatches!.at(-1);
      if (
        existing?.kind === "set" &&
        targetKey(existing.target) === targetKey(patch.target) &&
        existing.path.length === patch.path.length &&
        existing.path.every((part, index) => part === patch.path[index])
      ) {
        existing.after = patch.after;
        if (Object.is(existing.before, existing.after))
          this.transactionPatches!.splice(this.transactionPatches!.indexOf(existing), 1);
        return;
      }
    }
    this.transactionPatches!.push(patch);
  }

  private recordApplied(patches: readonly ProjectPatch[]) {
    addPatchHistory({
      patches,
      apply: (patch, direction) => this.applyPatch(patch, direction),
      alreadyApplied: true
    });
  }

  private applyPatch(patch: ProjectPatch, direction: HistoryDirection, transient = false): void {
    if ("data" in patch) {
      const shouldExist =
        patch.kind === "addRecord" ? direction === "forward" : direction === "backward";
      if (shouldExist)
        this.project.setRecord(patch.target.type, patch.target.id, patch.data as never);
      else this.project.deleteRecord(patch.target.type, patch.target.id);
      this.changed(patch, direction, transient);
      return;
    }

    const root = this.readRaw(patch.target);
    let next: unknown;
    if (patch.kind === "set") {
      next = replaceAtPath(root, patch.path, direction === "forward" ? patch.after : patch.before);
    } else if (patch.kind === "splice") {
      const array = valueAtPath(root, patch.path) as unknown[];
      const replacement = [...array];
      if (direction === "forward")
        replacement.splice(patch.index, patch.removed.length, ...patch.inserted);
      else replacement.splice(patch.index, patch.inserted.length, ...patch.removed);
      next = replaceAtPath(root, patch.path, replacement);
    } else {
      const array = valueAtPath(root, patch.path) as unknown[];
      const replacement =
        direction === "forward"
          ? moveItem(array, patch.from, patch.to)
          : moveItem(array, patch.to, patch.from);
      next = replaceAtPath(root, patch.path, replacement);
    }
    this.writeRaw(patch.target, next);
    this.changed(patch, direction, transient);
  }

  private readRaw(target: MutationTarget): unknown {
    return target.kind === "config"
      ? this.project.config
      : this.project.getUnsafe(target.type, target.id);
  }

  private writeRaw(target: MutationTarget, value: unknown) {
    if (target.kind === "config") this.project.setConfig(value as ProjectConfig);
    else this.project.setRecord(target.type, target.id, value as never);
  }

  private changed(patch: ProjectPatch, direction: HistoryDirection, transient: boolean) {
    const key = targetKey(patch.target);
    if (patch.target.kind === "config" || this.project.get(patch.target.type, patch.target.id))
      this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1);
    const change: ProjectChange = {
      target: patch.target,
      operation: patch.kind,
      path: "path" in patch ? patch.path : [],
      direction: transient ? "transient" : direction
    };
    this.listeners.get(key)?.forEach((listener) => listener(change));
  }
}

export class Field<T = unknown> implements FieldBinding<T> {
  constructor(
    private readonly mutator: ProjectMutator,
    readonly target: MutationTarget,
    readonly path: MutationPath
  ) {}

  get value(): T {
    return this.mutator.readPath<T>(this.target, this.path);
  }

  set(value: T) {
    this.mutator.set(this.target, this.path, value);
  }

  setTransient(value: T) {
    this.mutator.setTransient(this.target, this.path, value);
  }

  begin(): EditSession<T> {
    return this.mutator.beginSet<T>(this.target, this.path);
  }

  at<U = unknown>(...path: MutationPath): Binding<U> {
    return new Field(this.mutator, this.target, [...this.path, ...path]) as unknown as Binding<U>;
  }

  splice(index: number, deleteCount: number, ...inserted: unknown[]) {
    this.mutator.splice(this.target, this.path, index, deleteCount, ...inserted);
  }

  move(from: number, to: number) {
    this.mutator.move(this.target, this.path, from, to);
  }
}

export class RecordEditor<
  K extends RecordKey = RecordKey,
  T extends RecordValue<K> = RecordValue<K>
> extends Field<T> {
  readonly type: K;
  readonly id: string;

  constructor(mutator: ProjectMutator, type: K, id: string) {
    super(mutator, { kind: "record", type, id }, []);
    this.type = type;
    this.id = id;
  }

  field<P extends keyof T>(key: P): Binding<T[P]> {
    return this.at<T[P]>(key as string);
  }
}

export class ConfigEditor extends Field<ProjectConfig> {
  constructor(mutator: ProjectMutator) {
    super(mutator, { kind: "config" }, []);
  }

  field<P extends keyof ProjectConfig>(key: P): Binding<ProjectConfig[P]> {
    return this.at<ProjectConfig[P]>(key as string);
  }
}
