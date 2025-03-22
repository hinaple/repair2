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
import Value from "@classes/value/value.svelte";
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

export function pasted(pasteString, target = get(currentFocus), afterPasteChange = null) {
    try {
        const { IS_REPAIR_COPY, type, data } = JSON.parse(pasteString);
        if (!IS_REPAIR_COPY || !type || !data) return null;

        if (type === "sequence") {
            appData.addNodeWithHistory(
                addHistory,
                new Sequence({ ...data, nodePos: getViewportCenter() })
            );
        } else if (type === "entry") {
            appData.addNodeWithHistory(
                addHistory,
                new Entry({ ...data, nodePos: getViewportCenter() })
            );
        } else if (type === "branch") {
            appData.addNodeWithHistory(
                addHistory,
                new Branch({ ...data, nodePos: getViewportCenter() })
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
        // else if (target.type === "value" && type === "value" && target.data.parent)
        //     target.data.parent.setValueWithHistory(
        //         addHistory,
        //         new Value(data),
        //         target.data.isValueA,
        //         () => {
        //             reload("nodeMoved");
        //             afterPasteChange?.();
        //         }
        //     );
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

export function genClipboardFn(
    type,
    target,
    removing = null,
    { pasteData = null, afterPasteChange = null } = {}
) {
    return {
        ...(removing && {
            cut: () => {
                copyItem(target.copyData, type);
                removing();
                return true;
            }
        }),
        copy: () => {
            copyItem(target.copyData, type);
            return true;
        },
        paste: async (evt, string = null) => {
            if (!string) string = await navigator.clipboard.readText();
            pasted(string, { type, obj: target, data: pasteData }, afterPasteChange);
            return true;
        }
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
    target.data?.clipboardFn?.copy?.();
});

window.addEventListener("cut", (e) => {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    const target = get(currentFocus);
    target.data?.clipboardFn?.cut?.();
});
