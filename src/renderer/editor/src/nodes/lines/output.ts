import { getOriginalPos } from "../viewport";
import Grabber from "../../lib/grabber";
import { get } from "svelte/store";
import { onNodeReload } from "../../lib/stores";
import { writable, type Writable } from "svelte/store";
import { getMutator, getProject } from "../../project/store";
import type { FieldBinding } from "../../project/mutator";
import type { Action } from "svelte/action";

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

type OutputNodeParams = {
  id: string;
  binding: FieldBinding<string | null>;
  nodeId: string;
};
const outputNode: Action<HTMLElement, OutputNodeParams> = (node, params) => {
  let mounted = false;
  let drawing = false;

  const id = params.id;
  const binding = params.binding;

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
        binding.set(t);

        if (!updateToCoord()) {
          o.output = null;
          return;
        }
        positiveUpdate();
        return;
      }
      binding.set(null);
      negativeUpdate();
    },
    get output() {
      return binding.value;
    },
    fromId: id,
    fromCoord: null,
    toCoord: null,
    noBezier: false
  };
  outputs.set(id, o);

  const unsubscribeBinding = getMutator().subscribe(binding.target, (change) => {
    if (
      change.path.length === binding.path.length &&
      change.path.every((part, index) => part === binding.path[index])
    ) {
      console.log("MUTATOR");
      if (o.output && updateToCoord()) positiveUpdate();
      else negativeUpdate();
    }
  });

  const grabber = new Grabber({
    container: node,
    optimizedOnMoved: true,
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
      if (o.output !== targetEnd) {
        o.output = targetEnd;
      } else o.output = targetEnd;
    }
  });

  const unsub = onNodeReload((nodes, all) => {
    if (!((!destroyed && all) || nodes.has(params.nodeId) || (o.output && nodes.has(o.output))))
      return;

    // console.log(id, o.output, nodes, all);
    // const ParentSize = getNodeSize(id)
    const rect = node.getBoundingClientRect();
    const originalPos = getOriginalPos(rect.x, rect.y);
    // const originalPos =
    const currentCoord = { x: originalPos.x + 16 / 2, y: originalPos.y + 16 / 2 };
    // if (currentCoord.x !== o.fromCoord?.x && currentCoord.y !== o.fromCoord?.y) return;
    //Will optimize soon

    o.fromCoord = currentCoord;

    if (!mounted) {
      mounted = true;
      o.output = binding.value;

      return;
    }

    if (o.output) updateToCoord();
    if (drawing) lineUpdated("set", id);
  });

  let destroyed = false;
  return {
    destroy() {
      destroyed = true;
      if (grabber) grabber.destroy();
      unsub();
      unsubscribeBinding();
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

export function getConnectedOutputs(nodeId: string) {
  return [...outputs.values().filter((o) => o.output === nodeId)];
}
export function getAllConnectedOutputs(nodeIds: string[]) {
  return [...outputs.values().filter((o) => o.output && nodeIds.includes(o.output))];
}
