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

let history: (HistoryItem | HistoryItem[])[] = [];
let saveIdx = 0;
let currentCursor = 0;
function setCurrentCursor(v: number) {
  currentCursor = v;
  ipc.send(currentCursor !== saveIdx ? "unsaved" : "saved");
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

let group: {
  prom: Promise<void>;
  res: () => void;
  items: HistoryItem[];
} | null = null;
export function startGroup() {
  if (group) return;

  let res: () => void;
  const prom = new Promise<void>((r) => (res = r));
  group = {
    prom,
    res: res!,
    items: []
  };
}
export function endGroup() {
  if (!group) return;
  if (group.items.length !== 0) {
    console.log("NEW HISTORY GROUP", group.items);
    pushHistory(group.items);
  }
  group.res();
  group = null;
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

  if (group) group.items.push(tempHistory);
  else {
    pushHistory(tempHistory);
    console.log("NEW HISTORY", tempHistory);
  }

  return (newValue: DoData) => {
    currentDoData = newValue;
  };
}
export async function undo() {
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
  ipc.send("saved");
}

ipc.on("undo", undo);
ipc.on("redo", redo);
