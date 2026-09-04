import { getVariables } from "./variables";
import { getPreloads } from "./resources";
import { WaitingSteps } from "../project/step";
import { getProject, onReady } from "../project";
import { getAllComponents } from "./components";
import type { StandbyEntry } from "../project/nodes/standbyEntry";
import { editor } from "./msg";
import type { MsgRuntimeMonitorChange } from "@renderer/messagePort";

let changesBuffer: Array<MsgRuntimeMonitorChange> = [];

export function sendChanges(...data: MsgRuntimeMonitorChange): void {
  if (!monitoring) return;

  changesBuffer.push(data);
  readyToFlush();
}

const FLUSH_TIME_MS = 5;
let isReadyToFlush = false;
let flushTimeout: NodeJS.Timeout | number = 0;
function readyToFlush() {
  if (isReadyToFlush) return;

  isReadyToFlush = true;
  flushTimeout = setTimeout(flush, FLUSH_TIME_MS);
}

function flush() {
  editor.send("monitor:info", "update", changesBuffer);
  clear();
}
function clear() {
  changesBuffer = [];
  flushTimeout = 0;
  isReadyToFlush = false;
}
function discard() {
  clearTimeout(flushTimeout);
  clear();
}

export async function sendTotalInfo() {
  await onReady();

  if (!monitoring) return;
  discard();

  const variables = new Map(
    getVariables()
      .values()
      .map((v) => [v.id, v.value])
  );
  const preloads = [...getPreloads().keys()];
  const steps = WaitingSteps.values().reduce(
    (map: Map<string, number>, { id }) => map.set(id, (map.get(id) ?? 0) + 1),
    new Map()
  );
  const entries = getProject()
    .n.entry.filter((node) => node.d.standbyMode && (node as StandbyEntry).activated)
    .map((node) => node.d.id);
  const components = getAllComponents().map((c) => c.realId);
  editor.send("monitor:info", "total", {
    variables,
    preloads,
    steps,
    entries,
    components
  });
}

let monitoring: boolean = false;
editor.on("monitor:start", () => {
  monitoring = true;
  sendTotalInfo();
});
editor.on("end", () => {
  monitoring = false;
  discard();
});
