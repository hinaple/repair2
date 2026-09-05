import { unsaved } from "../../project/store";
import { registerMenuAction } from "../../titleBar/menuActions";
import { ipc } from "../ipc";

const MaxHistoryLen = 50;

type HistoryFn<Data = undefined> = (data: Data) => unknown;

type IsExactlyUndefined<T> = [T] extends [undefined]
  ? [undefined] extends [T]
    ? true
    : false
  : false;

type DataProp<Key extends string, Data> =
  IsExactlyUndefined<Data> extends true ? { [K in Key]?: Data } : { [K in Key]: Data };

type SameHistoryArgs<DoData = undefined> = {
  doFn: HistoryFn<DoData>;
  undoFn?: undefined;
  afterChange?: () => unknown;
} & DataProp<"doData", DoData> &
  DataProp<"undoData", DoData>;

type DifferentHistoryArgs<DoData = undefined, UndoData = undefined> = {
  doFn: HistoryFn<DoData>;
  undoFn: HistoryFn<UndoData>;
  afterChange?: () => unknown;
} & DataProp<"doData", DoData> &
  DataProp<"undoData", UndoData>;

type AddHistoryArgs<DoData = undefined, UndoData = DoData> =
  SameHistoryArgs<DoData> | DifferentHistoryArgs<DoData, UndoData>;

interface HistoryItem {
  redo: () => unknown;
  undo: () => unknown;
  afterChange?: () => unknown;
}

export type HistoryDirection = "forward" | "backward";

export interface PatchHistoryArgs<P> {
  patches: readonly P[];
  apply(patch: P, direction: HistoryDirection): unknown;
  afterChange?: () => unknown;
  alreadyApplied?: boolean;
}

let history: (HistoryItem | HistoryItem[])[] = [];
let saveIdx = 0;
let currentCursor = 0;
let beforeHistoryChange: (() => unknown) | null = null;
let pendingChangeCount = 0;

export function setBeforeHistoryChange(callback: (() => unknown) | null) {
  beforeHistoryChange = callback;
}
function setCurrentCursor(v: number) {
  currentCursor = v;
  notifySaveState();
}

function notifySaveState() {
  const v = currentCursor !== saveIdx || pendingChangeCount > 0;
  unsaved.set(v);
  ipc.send(v ? "unsaved" : "saved");
}

export function beginPendingHistoryChange() {
  let dirty = false;
  let finished = false;

  return {
    setDirty(value: boolean) {
      if (finished || dirty === value) return;
      dirty = value;
      pendingChangeCount += value ? 1 : -1;
      notifySaveState();
    },
    finish() {
      if (finished) return;
      finished = true;
      if (!dirty) return;
      pendingChangeCount--;
      notifySaveState();
    }
  };
}

function pushHistory(item: HistoryItem | HistoryItem[]) {
  if (history.length > currentCursor) history = history.toSpliced(currentCursor);
  history.push(item);
  setCurrentCursor(currentCursor + 1);
  if (history.length > MaxHistoryLen) {
    const offset = history.length - MaxHistoryLen;
    history = history.toSpliced(0, offset);
    currentCursor -= offset;
    saveIdx -= offset;
  }
}

function recordHistory(item: HistoryItem) {
  if (group) group.items.push(item);
  else pushHistory(item);
}

let group: {
  depth: number;
  prom: Promise<void>;
  res: () => void;
  items: HistoryItem[];
} | null = null;
export function startGroup() {
  if (group) {
    group.depth++;
    return;
  }

  let res: () => void;
  const prom = new Promise<void>((r) => (res = r));
  group = {
    depth: 1,
    prom,
    res: res!,
    items: []
  };
}
export function endGroup() {
  if (!group) {
    throw new Error("endGroup() called without a matching startGroup().");
  }

  group.depth--;
  if (group.depth > 0) return;

  const completedGroup = group;
  group = null;
  if (completedGroup.items.length !== 0) {
    pushHistory(completedGroup.items);
  }
  completedGroup.res();
}

type SyncResult<T> = T extends PromiseLike<unknown> ? never : T;

export function withHistoryGroup<T>(fn: () => SyncResult<T>): T {
  startGroup();
  try {
    return fn();
  } finally {
    endGroup();
  }
}

export function beforeSave() {
  return group?.prom;
}

export function addHistory<DoData = undefined>(
  args: SameHistoryArgs<DoData>
): (newValue: DoData) => void;
export function addHistory<DoData = undefined, UndoData = undefined>(
  args: DifferentHistoryArgs<DoData, UndoData>
): (newValue: DoData) => void;
export function addHistory<DoData = undefined, UndoData = DoData>(
  args: AddHistoryArgs<DoData, UndoData>
): (newValue: DoData) => void {
  const { doFn, afterChange } = args;
  let currentDoData: DoData = args.doData!;

  doFn(currentDoData);

  const tempHistory: HistoryItem = {
    redo: () => {
      doFn(currentDoData);
      afterChange?.();
    },
    undo: () => {
      if (args.undoFn) args.undoFn(args.undoData!);
      else doFn(args.undoData!);

      afterChange?.();
    },
    afterChange
  };

  recordHistory(tempHistory);

  return (newValue: DoData) => {
    currentDoData = newValue;
  };
}

/**
 * Stores serializable mutation data instead of requiring every caller to
 * maintain a matching do/undo function pair. Undo is applied in reverse order.
 */
export function addPatchHistory<P>({
  patches,
  apply,
  afterChange,
  alreadyApplied = false
}: PatchHistoryArgs<P>): void {
  if (patches.length === 0) return;

  const redo = () => {
    for (const patch of patches) apply(patch, "forward");
    afterChange?.();
  };
  const undo = () => {
    for (let i = patches.length - 1; i >= 0; i--) apply(patches[i], "backward");
    afterChange?.();
  };

  if (!alreadyApplied) redo();
  recordHistory({ redo, undo, afterChange });
}
export async function undo() {
  beforeHistoryChange?.();
  if (group) await group.prom;
  if (currentCursor <= 0) return;

  setCurrentCursor(currentCursor - 1);
  const h = history[currentCursor];
  if (!Array.isArray(h)) h.undo();
  else {
    for (let i = h.length - 1; i >= 0; i--) h[i].undo();
  }
}
export async function redo() {
  beforeHistoryChange?.();
  if (group) await group.prom;
  if (currentCursor >= history.length) return;

  const h = history[currentCursor];
  if (!Array.isArray(h)) h.redo();
  else h.forEach((hi) => hi.redo());
  setCurrentCursor(currentCursor + 1);
}
export async function clearHistory() {
  if (group) await group.prom;

  history = [];
  setCurrentCursor(0);
}
export function updateSaveIdx() {
  saveIdx = currentCursor;
  notifySaveState();
}

registerMenuAction("edit:undo", undo);
registerMenuAction("edit:redo", redo);
