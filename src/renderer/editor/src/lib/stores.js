import { writable } from "svelte/store";

export const grabbing = writable(null);
grabbing.subscribe((g) => {
    if (g) document.body.classList.add("grabbing");
    else document.body.classList.remove("grabbing");
});

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
