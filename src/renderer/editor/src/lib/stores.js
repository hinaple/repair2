import { writable } from "svelte/store";

/** @type {import("svelte/store").Writable<any>} */
export const grabbing = writable(null);
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
