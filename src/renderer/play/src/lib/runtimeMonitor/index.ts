import { getVariables } from "../variables";
import { getPreloads } from "../resources";
import { WaitingSteps } from "../../project/step";
import { getProject } from "../../project";
import { getAllComponents } from "../components";
import { ipc } from "../ipc";
import type { StandbyEntry } from "../../project/nodes/standbyEntry";
import type { IpcRuntimeMonitorChange } from "@shared/ipc.types";

let changesBuffer: Array<IpcRuntimeMonitorChange> = [];

export function sendChanges(...data: IpcRuntimeMonitorChange): void {
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
  ipc.send("monitor-info", { channel: "update", data: changesBuffer });
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

export function sendTotalInfo() {
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
  ipc.send("monitor-info", {
    channel: "total",
    data: {
      variables,
      preloads,
      steps,
      entries,
      components
    }
  });
}

let monitoring: boolean = false;
ipc.on("monitor-event", (evt, channel: string) => {
  if (channel === "start") {
    monitoring = true;
    sendTotalInfo();
  } else if (channel === "end") monitoring = false;
});
