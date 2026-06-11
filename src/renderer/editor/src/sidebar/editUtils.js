import { get, writable } from "svelte/store";
import { appData } from "../lib/syncData.svelte";
import { NodeClasses } from "@renderer/utils";
import { getAllChainedNodes } from "../nodes/connects";
import { ipc } from "../lib/ipc";

const NodeTypes = Object.keys(NodeClasses);

export const currentFocus = writable({ type: "project", obj: null });

let previewing = null;

export function selectManyNodes(nodes) {
    if (!nodes.length) return;

    if (nodes.length === 1) currentFocus.set(nodes[0].getFocusData());
    else currentFocus.set({ type: "nodes", arr: nodes.map((n) => n.getFocusData()) });
}

function expandFocus(type, obj) {
    if (!NodeTypes.includes(type)) return null;

    return getAllChainedNodes(obj).values().toArray();
}

const FOCUS_EXPAND_TIME_MS = 400;
let lastFocussed = null;
export function focusData(type, obj = appData.config, data = null) {
    const cf = get(currentFocus);

    if (lastFocussed && lastFocussed.obj === obj) {
        clearTimeout(lastFocussed.timeout);
        lastFocussed = null;
        const expanded = expandFocus(type, obj);
        if (expanded) {
            type = "nodes";
            obj = expanded.map((e) => ({ type: e.type, obj: e }));
        }
    } else
        lastFocussed = {
            timeout: setTimeout(() => (lastFocussed = null), FOCUS_EXPAND_TIME_MS),
            obj
        };

    if (
        type === "nodes" ||
        !NodeTypes.includes(type) ||
        (!(cf.type === "nodes" && (isShiftPressed || cf.arr.some((n) => n.obj === obj))) &&
            (!NodeTypes.includes(cf.type) || !isShiftPressed))
    ) {
        currentFocus.set({ type, [type === "nodes" ? "arr" : "obj"]: obj, data });
        if (type === "component" || type === "element") {
            ipc.send("layout-preview", { compData: data.preview.storeData });
            previewing = data.preview;
        } else if (previewing) {
            ipc.send("stop-preview");
            previewing = null;
        }

        return;
    }
    if (cf.type !== "nodes") {
        if (cf.obj !== obj)
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
    ipc.send("layout-preview", { compData: previewing.storeData, showContents });
}

export function setPreviewContentVisible(visible) {
    if (!previewing) return;
    ipc.send("preview-content-visible", visible);
}

let isShiftPressed = false;
window.addEventListener("keydown", (evt) => {
    if (evt.key === "Shift") isShiftPressed = true;
});

window.addEventListener("keyup", (evt) => {
    if (evt.key === "Shift") isShiftPressed = false;
});
