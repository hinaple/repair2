import { get, writable } from "svelte/store";
import { appData } from "../lib/syncData.svelte";
import { ipcRenderer } from "electron";

const NodeTypes = ["sequence", "branch", "entry"];

export const currentFocus = writable({ type: "project", obj: null });

let previewing = null;

export function selectManyNodes(nodes) {
    if (!nodes.length) return;

    if (nodes.length === 1) currentFocus.set(nodes[0].getFocusData());
    else currentFocus.set({ type: "nodes", arr: nodes.map((n) => n.getFocusData()) });
}

export function focusData(type, obj = appData.config, data = null) {
    const currentType = get(currentFocus).type;
    if (
        !NodeTypes.includes(type) ||
        (!(
            currentType === "nodes" &&
            (isShiftPressed || get(currentFocus).arr.some((n) => n.obj === obj))
        ) &&
            (!NodeTypes.includes(currentType) || !isShiftPressed))
    ) {
        currentFocus.set({ type, obj, data });
        if (type === "component" || type === "element") {
            ipcRenderer.send("layout-preview", { compData: data.preview.storeData });
            previewing = data.preview;
        } else if (previewing) {
            ipcRenderer.send("stop-preview");
            previewing = null;
        }

        return;
    }

    if (currentType !== "nodes") {
        if (get(currentFocus).obj !== obj)
            currentFocus.update((cf) => ({ type: "nodes", arr: [cf, { type, obj, data }] }));
        return;
    }
    currentFocus.update((cf) => {
        const targetIdx = cf.arr.findIndex((n) => n.obj === obj);
        if (targetIdx !== -1 && !isShiftPressed) return cf;
        if (targetIdx === -1) return { type: "nodes", arr: [...cf.arr, { type, obj, data }] };

        const resultArr = cf.arr.toSpliced(targetIdx, 1);
        if (resultArr.length === 1) return resultArr[0];
        return { type: "nodes", arr: resultArr };
    });
}

export function reloadPreview(showContents = false) {
    if (!previewing) return;
    ipcRenderer.send("layout-preview", { compData: previewing.storeData, showContents });
}

export function setPreviewContentVisible(visible) {
    if (!previewing) return;
    ipcRenderer.send("preview-content-visible", visible);
}

let isShiftPressed = false;
window.addEventListener("keydown", (evt) => {
    if (evt.key === "Shift") isShiftPressed = true;
});

window.addEventListener("keyup", (evt) => {
    if (evt.key === "Shift") isShiftPressed = false;
});
