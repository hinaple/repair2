import { get } from "svelte/store";
import { beforeSave, setBeforeHistoryChange, updateSaveIdx } from "../lib/editUtils/history";
import { setViewportSize, viewport } from "../nodes/viewport";
import { showToast } from "../lib/toast/toast.svelte";
import { ipc } from "../lib/ipc";
import { ProjectInstance } from "./project";
import { ProjectMutator } from "./mutator";

let project: ProjectInstance;
let mutator: ProjectMutator;

export function updateProject() {
  if (project) return;

  project = new ProjectInstance(ipc.sendSync("request-data"));
  mutator = new ProjectMutator(project);
  setBeforeHistoryChange(() => mutator.commitPendingEdits());
}
export function getProject() {
  return project!;
}
export function getMutator() {
  return mutator!;
}

export async function saveData() {
  mutator.commitPendingEdits();
  await beforeSave();
  project.setViewport({
    pos: get(viewport.pos),
    size: get(viewport.size)
  });
  const saved = await ipc.invoke("update-data", project);
  console.log("Saved", project);
  if (saved) {
    showToast({ title: "프로젝트를 저장했습니다.", duration: 2000 });
    updateSaveIdx();
  }
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
