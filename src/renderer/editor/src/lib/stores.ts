import { typedFromEntries } from "@shared/utils.types";
import { writable, type Writable } from "svelte/store";
import FrameUpdater from "./frameUpdater";

const Grabs = ["viewport", "viewportReady"] as const;
export const GrabKeys = typedFromEntries(Grabs.map((g) => [g, Symbol(g)]));

export const grabbing: Writable<any> = writable(null);
grabbing.subscribe((g) => {
  if (g === "select") {
    document.body.classList.add("selecting");
    document.body.classList.remove("grabbing");
  } else if (g && g !== "viewportReady") {
    document.body.classList.add("grabbing");
    document.body.classList.remove("selecting");
  } else {
    document.body.classList.remove("grabbing");
    document.body.classList.remove("selecting");
  }
});

type NodeReloadHandler = (ids: Set<string>, all: boolean) => unknown;
const nodeReloadHandlers = new Set<NodeReloadHandler>();
export function onNodeReload(handler: NodeReloadHandler) {
  nodeReloadHandlers.add(handler);
  return () => nodeReloadHandlers.delete(handler);
}

const movedNodes = new Set<string>();
const fu = new FrameUpdater(() => {
  if (gonnaReloadAll) {
    movedNodes.clear();
    gonnaReloadAll = false;
    nodeReloadHandlers.forEach((cb) => cb(movedNodes, true));

    return;
  }

  if (movedNodes.size <= 0) return;

  nodeReloadHandlers.forEach((cb) => cb(movedNodes, false));
  movedNodes.clear();
});

export function reloadNode(id: string) {
  if (gonnaReloadAll) return;

  movedNodes.add(id);
  fu.draw();
}

let gonnaReloadAll = false;
export function reloadAllNode() {
  gonnaReloadAll = true;
  fu.draw();
}
