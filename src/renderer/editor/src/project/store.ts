import { get } from "svelte/store";
import { beforeSave, updateSaveIdx } from "../lib/editUtils/history";
import { setViewportSize, viewport } from "../nodes/viewport";
import { showToast } from "../lib/toast/toast.svelte";
import { ipc } from "../lib/ipc";
import { ProjectInstance } from "./project";

let project: ProjectInstance;

export function updateProject() {
  if (project) return;

  project = new ProjectInstance(ipc.sendSync("request-data"));

  viewport.pos.set(project.viewport.pos);
  setViewportSize(project.viewport.size);
}
export function getProject() {
  return project!;
}

export async function saveData() {
  await beforeSave();
  const saved = await ipc.invoke("update-data", project);
  console.log("Saved", project);
  if (saved) showToast({ title: "프로젝트를 저장했습니다.", duration: 2000 });
  updateSaveIdx();
  return saved;
}

ipc.on("request-save", async (event, request) => {
  let saved = false;
  try {
    saved = await saveData();
  } catch (err) {
    console.error(err);
  }
  if (request.requestId) {
    ipc.send("request-save:done", { requestId: request.requestId, saved });
  }
});
