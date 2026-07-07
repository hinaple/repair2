import { get } from "svelte/store";
import { appData } from "../../../project/store";
import { addHistory } from "../history";
import { getViewportCenter } from "../../../nodes/viewport";
import { currentFocus, selectManyNodes } from "../focus";
import { clipboard } from "electron";
import { unpack, pack } from "msgpackr";
import { genId } from "@shared/genId";
import { reload } from "../../stores";
import { NODE_TYPES } from "@shared/constants";
import type { Types } from "@shared/projectData/types";
import { extractDataFrom, type ExtractResult } from "../extractData";
import type { CopyMap } from "./copyMap";

const ClipboardFormat = "application/x-repair2-clipboard-binary";

// type CopiedData<T extends keyof typeof CopyMap> = {
//   REPAIR_VERSION: string;
//   } & {  type: T,
//   data: 
// }

export function copyItem<T extends keyof typeof CopyMap>(type: T, data: ) {
  clipboard.writeBuffer(
    ClipboardFormat,
    pack({
      REPAIR_VERSION: __APP_VERSION__,
      type: itemType,
      data: itemData
    })
  );
}

export function pasted(target = get(currentFocus), pos: Record<"x" | "y", number> | null = null) {
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
          return new NodeClasses[n.type]({ ...n, id: newIds[i], nodePos }, { nodeIds: newIds });
      });
      appData.addManyNodes(newNodes);
      selectManyNodes(newNodes);
    } else if (type in NodeClasses) {
      appData.addNode(new NodeClasses[type]({ ...data, nodePos: pos ?? getViewportCenter() }));
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

export type ClipboardFn = "cut" | "copy" | "paste" | "delete";

export function genClipboardFn<
  C extends Copiable,
  E extends ClipboardFn,
  R extends (() => unknown) | null
>(
  type: C,
  target: EditableTypes[C],
  removing?: R,
  { excludes }?: { excludes?: E[] }
): Record<Exclude<ClipboardFn, R extends null ? E | "delete" | "cut" : E>, () => unknown>;
export function genClipboardFn<C extends Copiable>(
  type: C,
  target: EditableTypes[C],
  removing: (() => unknown) | null = null,
  { excludes = [] }: { excludes?: ClipboardFn[] } = {}
) {
  const currentCopy = () => {
    if (NODE_TYPES.includes(target.type)) copyNodes([target]);
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
      paste: () => {
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
function copyNodes(nodeIds: string[]) {
  const nodes: Types.Node[] = [];
  const result: ExtractResult = {};
  nodeIds.forEach((id) => {
    const { source } = extractDataFrom("nodes", id, { onlyOwns: true }, result);
    nodes.push(source);
  });
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
  if (e.key !== "Delete" || e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

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
