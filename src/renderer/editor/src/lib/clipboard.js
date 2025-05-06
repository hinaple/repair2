import { get } from "svelte/store";
import { appData } from "./syncData.svelte";
import { addHistory } from "./workHistory";
import { getViewportCenter } from "../nodes/viewport";
import { currentFocus } from "../sidebar/editUtils";

import Step from "@classes/step.svelte";
import Element from "@classes/element.svelte";
import Listener from "@classes/listener.svelte";
import Branch from "@classes/nodes/branch.svelte";
import Entry from "@classes/nodes/entry.svelte";
import Sequence from "@classes/nodes/sequence.svelte";
import ValueProcess from "@classes/value/valueProcess";
import { reload } from "./stores";

export function copyItem(itemData, itemType) {
    navigator.clipboard.writeText(
        JSON.stringify({
            IS_REPAIR_COPY: true,
            REPAIR_VERSION: __APP_VERSION__,
            type: itemType,
            data: itemData
        })
    );
}

export function pasted(pasteString, target = get(currentFocus), pos = null) {
    try {
        const { IS_REPAIR_COPY, type, data } = JSON.parse(pasteString);
        if (!IS_REPAIR_COPY || !type || !data) return null;

        if (type === "nodes") {
            const posOffset = data[0].nodePos;
            const newNodes = data.map((n) => {
                const nodePos = {
                    x: n.nodePos.x - posOffset.x + (pos ?? getViewportCenter()).x,
                    y: n.nodePos.y - posOffset.y + (pos ?? getViewportCenter()).y
                };
                if (n.type === "sequence") return new Sequence({ ...n, nodePos });
                else if (n.type === "branch") return new Branch({ ...n, nodePos });
                else if (n.type === "entry") return new Entry({ ...n, nodePos });
            });
            appData.addManyNodeWithHistory(addHistory, newNodes);
        } else if (type === "sequence") {
            appData.addNodeWithHistory(
                addHistory,
                new Sequence({ ...data, nodePos: pos ?? getViewportCenter() })
            );
        } else if (type === "entry") {
            appData.addNodeWithHistory(
                addHistory,
                new Entry({ ...data, nodePos: pos ?? getViewportCenter() })
            );
        } else if (type === "branch") {
            appData.addNodeWithHistory(
                addHistory,
                new Branch({ ...data, nodePos: pos ?? getViewportCenter() })
            );
        } else if (target.type === "sequence" && type === "step")
            target.obj.steps.addWithHistory(addHistory, {
                addingEl: new Step(data),
                afterChange: () => reload("nodeMoved")
            });
        else if (target.type === "component" && type === "element")
            target.obj.elements.addWithHistory(addHistory, {
                addingEl: new Element(data),
                afterChange: () => reload("nodeMoved")
            });
        else if (target.type === "element" && type === "listener")
            target.obj.listeners.addWithHistory(addHistory, {
                addingEl: new Listener(data),
                afterChange: () => reload("nodeMoved")
            });
        else if (target.type === "value" && type === "valueProcess")
            target.obj.process.addWithHistory(addHistory, {
                addingEl: new ValueProcess(data),
                afterChange: () => reload("nodeMoved")
            });
        else return;
    } catch {
        return null;
    }
}

export function genClipboardFn(type, target, removing = null, { excludes = [] } = {}) {
    return {
        ...(removing &&
            !excludes.includes("cut") && {
                cut: () => {
                    copyItem(target.copyData, type);
                    removing();
                    return true;
                }
            }),
        ...(!excludes.includes("copy") && {
            copy: () => {
                copyItem(target.copyData, type);
                return true;
            }
        }),
        ...(!excludes.includes("paste") && {
            paste: async (evt, string = null) => {
                if (!string) string = await navigator.clipboard.readText();
                pasted(string, { type, obj: target });
                return true;
            }
        }),
        ...(removing && !excludes.includes("delete") && { delete: removing })
    };
}

window.addEventListener("paste", (e) => {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    const target = get(currentFocus);
    if (target.data?.clipboardFn?.paste) {
        target.data.clipboardFn.paste(null, e.clipboardData.getData("text"));
        return;
    }
    pasted(e.clipboardData.getData("text"), target);
});

window.addEventListener("copy", (e) => {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    const target = get(currentFocus);

    if (target.type === "nodes") {
        copyItem(
            target.arr.map(({ obj }) => obj.copyData),
            "nodes"
        );
        return;
    }
    target.data?.clipboardFn?.copy?.();
});

window.addEventListener("cut", (e) => {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    const target = get(currentFocus);
    target.data?.clipboardFn?.cut?.();
});

window.addEventListener("keydown", (e) => {
    if (e.key !== "Delete" || e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")
        return;

    const target = get(currentFocus);
    target.data?.clipboardFn?.delete?.();
});
