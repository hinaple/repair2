import { getOriginalPos } from "../viewport";
import Grabber from "../../lib/grabber";
import { get } from "svelte/store";
import { addHistory } from "../../lib/editUtils/history";
import { nodeMovedReloader } from "../../lib/stores";
import FrameUpdater from "../../lib/frameUpdater";
import { writable, type Writable } from "svelte/store";
import { getProject } from "../../project/store";

type Coord = Record<"x" | "y", number>;
export interface Output {
  fromId: string;
  fromCoord: Coord | null;
  toCoord: Coord | null;
  noBezier: boolean;
  output: string | null;
}

const outputs = new Map<string, Output>();
const drawings = new Map<string, Output>();
export const hoverInput: Writable<string | null> = writable(null);

type OutputNodeParams<K extends string> =
  | {
      id: string;
      outputKey: K;
      data: { [k in K]: string | null };
    }
  | {
      id: string;
      outputKey?: "output";
      data: { output: string | null };
    };
const outputNode = <K extends string>(node: HTMLElement, params: OutputNodeParams<K>) => {
  let mounted = false;
  let drawing = false;

  const id = params.id;
  const outputKey = params.outputKey ?? "output";
  const data = params.data as { [k in typeof outputKey]: string | null };

  function positiveUpdate() {
    if (!mounted) return;

    if (!drawing) {
      drawing = true;
      drawings.set(id, o);
    }
    lineUpdated("set", id);
  }
  function negativeUpdate() {
    if (!mounted || !drawing) return;

    drawing = false;
    drawings.delete(id);
    lineUpdated("remove", id);
  }
  function updateToCoord() {
    const connectedNode = getProject().nodes.get(o.output!);
    if (!connectedNode) return false;

    o.toCoord = {
      x: connectedNode.nodePos.x,
      y: connectedNode.nodePos.y + (connectedNode.nodeType === "entry" ? 45 : 30) / 2
    };

    return true;
  }
  const o: Output = {
    set output(t: string | null) {
      if (t) {
        data[outputKey] = t;

        if (!updateToCoord()) {
          o.output = null;
          return;
        }
        positiveUpdate();
        return;
      }
      data[outputKey] = null;
      negativeUpdate();
    },
    get output() {
      return data[outputKey];
    },
    fromId: id,
    fromCoord: null,
    toCoord: null,
    noBezier: false
  };
  outputs.set(id, o);

  const grabber = new Grabber({
    container: node,
    onMoveStart: () => {
      if (!mounted || destroyed) return;

      o.toCoord = {
        x: o.fromCoord!.x,
        y: o.fromCoord!.y
      };
      o.noBezier = true;
      positiveUpdate();
    },
    onMoved: ({ dx, dy }) => {
      if (!mounted || !o.toCoord || destroyed) return;

      o.toCoord.x += dx;
      o.toCoord.y += dy;
      positiveUpdate();
    },
    onMoveEnd: () => {
      if (!mounted || destroyed) return;

      o.noBezier = false;
      const targetEnd = get(hoverInput);
      const prev = o.output;
      if (prev !== targetEnd) {
        addHistory({
          doFn: (d) => {
            o.output = d;
          },
          doData: targetEnd,
          undoData: prev
        });
      } else o.output = targetEnd;
    }
  });

  const frameUpdater = new FrameUpdater(async () => {
    if (destroyed) return;

    const rect = node.getBoundingClientRect();
    const originalPos = getOriginalPos(rect.x, rect.y);
    const currentCoord = { x: originalPos.x + 16 / 2, y: originalPos.y + 16 / 2 };
    // if (currentCoord.x !== o.fromCoord?.x && currentCoord.y !== o.fromCoord?.y) return;
    //Will optimize soon

    o.fromCoord = currentCoord;

    if (!mounted) {
      mounted = true;
      o.output = data[outputKey];

      return;
    }

    if (o.output) updateToCoord();
    if (drawing) lineUpdated("set", id);
  }, 1);

  const unsub = nodeMovedReloader.subscribe(() => {
    frameUpdater.draw();
  });

  let destroyed = false;
  return {
    destroy() {
      destroyed = true;
      if (grabber) grabber.destroy();
      unsub();
      negativeUpdate();
      outputs.delete(id);
    }
  };
};
export default outputNode;

type LineChangeType = "reset" | "set" | "remove";
type LineSubCB = (type: LineChangeType, changedId?: string) => void;
let lineSubscription: LineSubCB | null = null;
export function subscribeLines(cb: LineSubCB) {
  lineSubscription = cb;
  lineUpdated("reset");
  return () => {
    if (cb === lineSubscription) lineSubscription = null;
  };
}
function lineUpdated(type: "reset"): void;
function lineUpdated(type: "set" | "remove", id: string): void;
function lineUpdated(type: LineChangeType, id?: string) {
  lineSubscription?.(type, id);
}

export function getLines() {
  return drawings;
}

export function setAllOutput(outputs: Output[], toId: string | null) {
  outputs.forEach((o) => (o.output = toId));
}
export function getConnectedOutputs(nodeId: string) {
  return [...outputs.values().filter((o) => o.output === nodeId)];
}
export function getAllConnectedOutputs(nodeIds: string[]) {
  return [...outputs.values().filter((o) => o.output && nodeIds.includes(o.output))];
}
