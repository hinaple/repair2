import { get, writable, type Writable } from "svelte/store";
import { SvelteSet } from "svelte/reactivity";
import { getAllChainedNodes } from "./connects";

export type FocusData =
  | { type: "project"; target: null; parents?: undefined }
  | { type: "nodes"; target: Set<string>; parents?: undefined }
  | { [T in Focussable]: { type: T; target: string; parents?: string[] } }[Focussable];

export const currentFocus: Writable<FocusData> = writable({ type: "project", target: null });

function expandFocus(f: Extract<FocusData, { target: string }>) {
  if (f.type !== "node") return null;
  return getAllChainedNodes(f.target);
}

const FOCUS_EXPAND_TIME_MS = 200;
let lastFocussed:
  | (FocusData & {
      timeout: NodeJS.Timeout;
    })
  | null = null;

function processFocusExpanding(f: FocusData): FocusData {
  if (f.type === "project" || f.type === "nodes") {
    lastFocussed = null;
    return f;
  }

  if (lastFocussed && lastFocussed.type === f.type && lastFocussed.target === f.target) {
    clearTimeout(lastFocussed.timeout);
    const expanded = expandFocus(f);
    if (expanded) {
      lastFocussed = null;
      return {
        type: "nodes",
        target: new Set(expanded)
      };
    }
  }

  lastFocussed = {
    ...f,
    timeout: setTimeout(() => (lastFocussed = null), FOCUS_EXPAND_TIME_MS)
  };
  return f;
}

function selectNodeOnNode(cf: FocusData, f: FocusData): boolean {
  if (!isShiftPressed && cf.type === "nodes" && f.type === "node" && cf.target.has(f.target))
    return true;

  if (
    !isShiftPressed ||
    (cf.type !== "node" && cf.type !== "nodes") ||
    (f.type !== "node" && f.type !== "nodes")
  )
    return false;

  const before = cf.type === "nodes" ? cf.target : new Set([cf.target]);

  const result = before.symmetricDifference(f.type === "nodes" ? f.target : new Set([f.target]));

  if (result.size === 0) {
    focusData("project");
    return true;
  }
  if (result.size === before.size && result.isSubsetOf(before)) return true;
  if (result.size === 1) {
    currentFocus.set({ type: "node", target: result.values().next().value! });
    return true;
  }

  currentFocus.set({ type: "nodes", target: new SvelteSet(result) });
  return true;
}

export function focusData<T extends FocusData>(
  type: T["type"],
  target?: T["target"],
  parents?: T["parents"]
): unknown {
  const cf = get(currentFocus);

  let f = processFocusExpanding({ type, target: target ?? null, parents } as FocusData);

  console.log(f);
  if (f.type === "nodes") {
    if (f.target.size === 0) return;
    else if (f.target.size === 1)
      f = { type: "node", target: f.target.values().next().value!, parents };
  }

  if (selectNodeOnNode(cf, f)) return;

  if (f.type === "nodes") currentFocus.set({ type: "nodes", target: new SvelteSet(f.target) });
  else currentFocus.set(f);
}

let isShiftPressed = false;
window.addEventListener(
  "keydown",
  (evt) => {
    if (evt.key === "Shift") isShiftPressed = true;
  },
  { passive: true }
);

window.addEventListener(
  "keyup",
  (evt) => {
    if (evt.key === "Shift") isShiftPressed = false;
  },
  { passive: true }
);
