import { reload } from "../../lib/stores";
import { writable, type Writable } from "svelte/store";

type Coord = Record<"x" | "y", number>;

export interface Line {
  fromCoord: Coord;
  toCoord: Coord;
  fromId: string;
  output: string | null;
  noBezier?: boolean;
}

const lines: Map<string, Line> = new Map();
export const hoverInput: Writable<string | null> = writable(null);

type LineChangeType = "reset" | "set" | "remove";
type LineSubCB = (type: LineChangeType, changedId?: string) => void;
let lineSubscription: LineSubCB | null = null;
export function subscribeLines(cb: LineSubCB) {
  lineSubscription = cb;
  sendLineData("reset");
  return () => {
    if (cb === lineSubscription) lineSubscription = null;
  };
}
function sendLineData(type: "reset"): void;
function sendLineData(type: "set" | "remove", id: string): void;
function sendLineData(type: LineChangeType, id?: string) {
  lineSubscription?.(type, id);
}

export function getLines() {
  return lines;
}

export function syncLine({ fromCoord, toCoord, fromId, output, noBezier = false }: Line) {
  lines.set(fromId, {
    output,
    fromId,
    fromCoord,
    toCoord,
    noBezier
  });
  sendLineData("set", fromId);
}
export function removeLine(fromId: string) {
  lines.delete(fromId);
  sendLineData("remove", fromId);
}
export function setAllOutput(lines: Line[], toId: string | null) {
  lines.forEach((l) => (l.output = toId));
  reload("nodeMoved");
}
export function getConnectedLines(nodeId: string) {
  return [...lines.values().filter((l) => l.output === nodeId)];
}
export function getAllConnectedLines(nodeIds: string[]) {
  return [...lines.values().filter((l) => l.output && nodeIds.includes(l.output))];
}
