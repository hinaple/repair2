import { ipc } from "./ipc";

const MaxHistoryLen = 50;

type HistoryFn<Data = undefined> = (data: Data) => unknown;

type SameHistoryArgs<DoData = undefined> = {
  doFn: HistoryFn<DoData>;
  undoFn?: undefined;
  doData?: DoData;
  undoData?: DoData;
};

type DifferentHistoryArgs<DoData = undefined, UndoData = undefined> = {
  doFn: HistoryFn<DoData>;
  undoFn: HistoryFn<UndoData>;
  doData?: DoData;
  undoData?: UndoData;
};

type AddHistoryArgs<DoData = undefined, UndoData = DoData> =
  | SameHistoryArgs<DoData>
  | DifferentHistoryArgs<DoData, UndoData>;

interface HistoryItem {
  redo: () => unknown;
  undo: () => unknown;
}

let history: HistoryItem[] = [];
let saveIdx = 0;
let currentCursor = 0;
function setCurrentCursor(v: number) {
  currentCursor = v;
  ipc.send(currentCursor !== saveIdx ? "unsaved" : "saved");
}

export function addHistory<DoData = undefined>(
  args: SameHistoryArgs<DoData>
): (newValue: DoData) => void;
export function addHistory<DoData = undefined, UndoData = undefined>(
  args: DifferentHistoryArgs<DoData, UndoData>
): (newValue: DoData) => void;
export function addHistory<DoData = undefined, UndoData = DoData>({
  doFn,
  undoFn,
  doData,
  undoData
}: AddHistoryArgs<DoData, UndoData>): (newValue: DoData) => void {
  let currentDoData = doData;

  doFn(currentDoData as DoData);
  if (history.length > currentCursor) history = history.toSpliced(currentCursor);
  const tempHistory: HistoryItem = {
    redo: () => doFn(currentDoData as DoData),
    undo: () => {
      if (undoFn) {
        undoFn(undoData as UndoData);
      } else {
        doFn(undoData as DoData);
      }
    }
  };
  history.push(tempHistory);
  console.log("NEW HISTORY", history[currentCursor]);
  setCurrentCursor(currentCursor + 1);
  if (history.length > MaxHistoryLen) {
    const offset = history.length - MaxHistoryLen;
    history = history.toSpliced(0, offset);
    currentCursor -= offset;
    saveIdx -= offset;
  }

  return (newValue: DoData) => {
    currentDoData = newValue;
  };
}
export function undo() {
  if (currentCursor <= 0) return;
  setCurrentCursor(currentCursor - 1);
  history[currentCursor].undo();
}
export function redo() {
  if (currentCursor >= history.length) return;
  history[currentCursor].redo();
  setCurrentCursor(currentCursor + 1);
}
export function clearHistory() {
  history = [];
  setCurrentCursor(0);
}
export function updateSaveIdx() {
  saveIdx = currentCursor;
  ipc.send("saved");
}

ipc.on("undo", undo);
ipc.on("redo", redo);
