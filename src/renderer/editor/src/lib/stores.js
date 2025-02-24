import { writable } from "svelte/store";

export const grabbing = writable(null);

export const sequenceMovedReloader = writable();
export const nodeMovedReloader = writable();
const reloaders = {
    sequenceMoved: sequenceMovedReloader,
    nodeMoved: nodeMovedReloader
};
export function reload(key) {
    reloaders[key].set(Symbol());
    if (key === "sequenceMoved") reload("nodeMoved");
}
