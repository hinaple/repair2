import { typedFromEntries } from "@shared/utils.types";
import { writable, type Writable } from "svelte/store";

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

type ReloaderKeys = `${"sequence" | "node"}Moved`;
export const sequenceMovedReloader = writable(Symbol());
export const nodeMovedReloader = writable(Symbol());
const reloaders: Record<ReloaderKeys, Writable<Symbol>> = {
  sequenceMoved: sequenceMovedReloader,
  nodeMoved: nodeMovedReloader
};
export function reload(key: ReloaderKeys) {
  reloaders[key].set(Symbol());
  if (key === "sequenceMoved") reload("nodeMoved");
}
