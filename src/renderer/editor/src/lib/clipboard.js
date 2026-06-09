import { get } from "svelte/store";
import { appData } from "./syncData.svelte";
import { addHistory } from "./workHistory";
import { getViewportCenter } from "../nodes/viewport";
import { currentFocus, selectManyNodes } from "../sidebar/editUtils";
import { clipboard } from "electron";
import { unpack, pack } from "msgpackr";

import Step from "@classes/step.svelte";
import Element from "@classes/element.svelte";
import Listener from "@classes/listener.svelte";
import ValueProcess from "@classes/value/valueProcess";
import { NodeClasses, genId } from "@classes/utils";
import { reload } from "./stores";

const ClipboardFormat = "application/x-repair2-clipboard-binary";

export function copyItem(itemData, itemType) {
    clipboard.writeBuffer(
        ClipboardFormat,
        pack({
            REPAIR_VERSION: __APP_VERSION__,
            type: itemType,
            data: itemData
        })
    );
}

export function pasted(target = get(currentFocus), pos = null) {
    try {
        if (!clipboard.has(ClipboardFormat)) return;
        const { type, data } = unpack(clipboard.readBuffer(ClipboardFormat));
        if (!type || !data) return null;

        if (type === "nodes") {
            const posOffset = data[0].nodePos;
            const newIds = Array.from(data, () => genId());
            const targetPos = pos ?? getViewportCenter();
            const newNodes = data.map((n, i) => {
                const nodePos = {
                    x: n.nodePos.x - posOffset.x + targetPos.x,
                    y: n.nodePos.y - posOffset.y + targetPos.y
                };
                if (n.type in NodeClasses)
                    return new NodeClasses[n.type](
                        { ...n, id: newIds[i], nodePos },
                        { nodeIds: newIds }
                    );
            });
            appData.addManyNodes(newNodes);
            selectManyNodes(newNodes);
        } else if (type in NodeClasses) {
            appData.addNode(
                new NodeClasses[type]({ ...data, nodePos: pos ?? getViewportCenter() })
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
    } catch (err) {
        console.error("An error occurred while pasting.", err);
    }
}

export function genClipboardFn(type, target, removing = null, { excludes = [] } = {}) {
    const currentCopy = () => {
        if (target.type in NodeClasses) copyNodes([target]);
        else copyItem(target.copyData(), type);
    };
    return {
        ...(removing &&
            !excludes.includes("cut") && {
                cut: () => {
                    currentCopy();
                    removing();
                    return true;
                }
            }),
        ...(!excludes.includes("copy") && {
            copy: () => {
                currentCopy();
                return true;
            }
        }),
        ...(!excludes.includes("paste") && {
            paste: async () => {
                pasted({ type, obj: target });
                return true;
            }
        }),
        ...(removing && !excludes.includes("delete") && { delete: removing })
    };
}

function pasteHandler(e) {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    const target = get(currentFocus);
    if (target.data?.clipboardFn?.paste) {
        target.data.clipboardFn.paste();
        return;
    }
    pasted(target);
}
function copyNodes(nodesArr) {
    const nodeIds = nodesArr.map((n) => n.id);
    copyItem(
        nodesArr.map((node) => node.copyData(nodeIds)),
        "nodes"
    );
}
function copyHandler(e) {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    const target = get(currentFocus);

    if (target.type === "nodes") {
        copyNodes(target.arr.map((n) => n.obj));
        return;
    }
    target.data?.clipboardFn?.copy?.();
}
function cutHandler(e) {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    const target = get(currentFocus);
    if (target.type === "nodes") {
        copyNodes(target.arr.map((n) => n.obj));
        appData.removeManyNodes(target.arr.map((n) => n.obj));
        return;
    }
    target.data?.clipboardFn?.cut?.();
}
function keyDownHandler(e) {
    if (e.key !== "Delete" || e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")
        return;

    const target = get(currentFocus);
    if (target.type === "nodes") {
        appData.removeManyNodes(target.arr.map((n) => n.obj));
        return;
    }
    target.data?.clipboardFn?.delete?.();
}

window.addEventListener("paste", pasteHandler);
window.addEventListener("copy", copyHandler);
window.addEventListener("cut", cutHandler);
window.addEventListener("keydown", keyDownHandler);

if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
        window.removeEventListener("paste", pasteHandler);
        window.removeEventListener("copy", copyHandler);
        window.removeEventListener("cut", cutHandler);
        window.removeEventListener("keydown", keyDownHandler);
    });
}
