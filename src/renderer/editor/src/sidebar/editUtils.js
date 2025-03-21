import { writable } from "svelte/store";
import { appData } from "../lib/syncData.svelte";
import { ipcRenderer } from "electron";

export const currentFocus = writable({ type: "project", obj: null });

let previewing = null;
export function focusData(type, obj = appData.config, data = null) {
    currentFocus.set({ type, obj, data });
    if (type === "component" || type === "element") {
        ipcRenderer.send("layout-preview", { compData: data.preview.storeData });
        previewing = data.preview;
    } else if (previewing) {
        ipcRenderer.send("stop-preview");
        previewing = null;
    }
}

export function reloadPreview() {
    if (!previewing) return;
    ipcRenderer.send("layout-preview", { compData: previewing.storeData });
}
