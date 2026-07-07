import { addHistory } from "./history";

type Getter = () => string[];
type Setter = (arr: string[]) => unknown;

type GetSet = {
  get: Getter;
  set: Setter;
};

function reorder({ get, set }: GetSet, from: number, to: number) {
  set(get().toSpliced(to, 0, get().splice(from, 1)[0]));
}
function remove({ get, set }: GetSet, idx: number) {
  if (idx === -1) return;
  set(get().toSpliced(idx, 1));
}
function append({ get, set }: GetSet, v: string) {
  set([...get(), v]);
}
function insert({ get, set }: GetSet, idx: number, v: string) {
  set(get().toSpliced(idx, 0, v));
}

function reorderWithHistory(getset: GetSet, from: number, to: number) {
  addHistory({
    doFn: ([f, t]) => reorder(getset, f, t),
    doData: [from, to],
    undoData: [to, from]
  });
}
function removeWithHistory(getset: GetSet, idx: number, afterChange?: () => unknown) {
  addHistory({
    doFn: () => remove(getset, idx),
    undoFn: (v) => insert(getset, idx, v),
    undoData: getset.get()[idx],
    afterChange
  });
}
function appendWithHistory(getset: GetSet, v: string) {
  addHistory({
    doFn: () => append(getset, v),
    undoFn: (idx) => remove(getset, idx),
    undoData: getset.get().length
  });
}

export const SortableUtils = {
  reorder,
  remove,
  append,
  insert,
  reorderWithHistory,
  removeWithHistory,
  appendWithHistory
};
