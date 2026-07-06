import { get, writable, type Writable } from "svelte/store";
import { appData } from "../lib/syncData.svelte";
import { getAllChainedNodes } from "../nodes/connects";
import { ipc } from "../lib/ipc";
import { NODE_TYPES } from "@shared/constants";
import type { Types } from "@shared/projectData/types";
import type { ClipboardFn } from "../lib/clipboard";
import { typedIncludes } from "@shared/utils.types";

type ClipboardData = {
  clipboardFn: Partial<Record<ClipboardFn, () => unknown>>;
};

type NodeFocusData = {
  [T in (typeof NODE_TYPES)[number]]: {
    type: T;
    obj: Extract<Types.Node, { nodeType: T }>;
    data: ClipboardData;
  };
}[(typeof NODE_TYPES)[number]];

type FocusData =
  | {
      type: "project";
      obj: null;
      data?: undefined;
    }
  | {
      type: "nodes";
      obj: Omit<NodeFocusData, "data">[];
      data?: undefined;
    }
  | NodeFocusData
  | {
      type: "component";
      obj: Types.Component;
      data: {
        preview: Types.Component;
        clipboardFn: { paste: () => unknown };
      };
    }
  | {
      type: "step";
      obj: Types.Step;
      data: {
        preview: Types.Component;
      } & ClipboardData;
    }
  | {
      type: "element";
      obj: Types.Element;
      data: {
        preview: Types.Component;
      } & ClipboardData;
    }
  | {
      type: "listener";
      obj: Types.Listener;
      data: ClipboardData;
    }
  | {
      type: "valueProcess";
      obj: Types.ValueProcess;
      data: ClipboardData;
    };
export const currentFocus: Writable<FocusData> = writable({ type: "project", obj: null });

let previewing = null;

export function selectManyNodes(nodes: Types.Node[]) {
  if (!nodes.length) return;

  if (nodes.length === 1) currentFocus.set(nodes[0].getFocusData());
  else currentFocus.set({ type: "nodes", arr: nodes.map((n) => n.getFocusData()) });
}

function expandFocus<T extends FocusData>(type: T["type"], obj: T["obj"]) {
  // if (!NODE_TYPES.includes(type as any)) return null;
  if (!typedIncludes(NODE_TYPES, type)) return null;

  return getAllChainedNodes(obj as Types.Node)
    .values()
    .toArray();
}

const FOCUS_EXPAND_TIME_MS = 400;
let lastFocussed: {
  timeout: NodeJS.Timeout;
  obj: Extract<FocusData, { obj: any }>["obj"];
} | null = null;
export function focusData<T extends FocusData>(
  type: T["type"],
  obj: T["obj"],
  data: T["data"]
): void {
  const cf = get(currentFocus);

  let f = { type, obj: obj ?? null, data } as FocusData;
  if (lastFocussed && lastFocussed.obj === obj) {
    clearTimeout(lastFocussed.timeout);
    lastFocussed = null;
    const expanded = expandFocus(type, obj);
    if (expanded) {
      f = {
        type: "nodes",
        obj: expanded.map((e) => ({ type: e.nodeType, obj: e }))
      };
    }
  } else
    lastFocussed = {
      timeout: setTimeout(() => (lastFocussed = null), FOCUS_EXPAND_TIME_MS),
      obj
    };

  if (
    f.type === "nodes" || //selecting many nodes
    !typedIncludes(NODE_TYPES, f.type) || //selecting NOT single node
    (!(cf.type === "nodes" && (isShiftPressed || cf.obj.some((n) => n.obj === obj))) &&
      (!typedIncludes(NODE_TYPES, cf.type) || !isShiftPressed))
  ) {
    currentFocus.set(f);
    if (f.data && "preview" in f.data) {
      ipc.send("layout-preview", { component: f.data.preview });
      previewing = f.data.preview;
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
