import "../lib/plugin/pluginManager";
import { registerUtils } from "../lib/repairUtils";
import initShortcuts from "../lib/shortcut";
import { sendTotalInfo } from "../lib/runtimeMonitor";
import { activateRuntimePlugins } from "../lib/plugin/runtimePlugins";
import { registerPluginContextApi } from "../lib/plugin/pluginContext";
import { ipc } from "../lib/ipc";
import { Project } from "./projectInstance";
import { applyStyle } from "./config";
import type { Types } from "@shared/projectData/types";

let project: Project;
const gamezone = document.getElementById("gamezone") as HTMLDivElement;
const globalStyles = document.createElement("style");
globalStyles.id = "global-styles";
document.head.append(globalStyles);

let onReadyResolve: (() => void) | null;
let onReadyProm: Promise<void> = new Promise(
  (res) =>
    (onReadyResolve = () => {
      res();
      onReadyResolve = null;
    })
);
export function onReady(): Promise<void> {
  return onReadyProm;
}
export function updateData(data = ipc.sendSync("request-data")): Project {
  project = new Project(data);
  console.log(project);
  initShortcuts(project.findAllEntries("shortcut"));
  activateRuntimePlugins(
    project.data.config.runtimePlugins
      ?.map((p) => project.data.pluginPointers.get(p))
      .filter((p): p is Types.PluginPointer => !!p) ?? []
  );

  sendTotalInfo();

  applyStyle(document.body, gamezone, data.config);
  globalStyles.textContent = data.globalStyles;

  onReadyResolve?.();
  return project;
}

ipc.on("data", (event, data) => {
  console.log(data);
  updateData(data);
});

ipc.on("global-css", (event, css) => {
  globalStyles.textContent = css;
});

export function getProject() {
  return project;
}

export function getSizeRatio(): [number, number] {
  const ratio = (project.data.config.sizeRatio || "1").toString().split(",").map(Number);
  return [ratio[0], ratio[ratio.length === 2 ? 1 : 0]];
}

registerUtils("getAppData", getProject);
registerUtils("getSizeRatio", getSizeRatio);
registerPluginContextApi("appData", { get: getProject });
