import { addHistory } from "../../lib/workHistory";
import { join } from "path";
import { ipc } from "../../lib/ipc";
import type { Types } from "@shared/projectData/types";

export const AssetDir = join(ipc.sendSync("getDataDir"), "assets");

export function splitPath(path: string) {
  return path.replace(AssetDir, "").replace(/^\\/, "").replace(/\\/g, "/");
}

export async function changeResourceFile(resource: Types.Resource) {
  const result = await ipc.invoke("selectFile", {
    title: "변경할 자원 파일 선택",
    properties: ["openFile"]
  });
  let target = result.filePaths?.[0];
  if (result.canceled || !target) return;

  if (!target.includes(AssetDir)) {
    if (
      (
        await ipc.invoke("dialog", {
          type: "question",
          title: "다른 폴더의 파일입니다.",
          message: `${target}\n\n위 파일을 자원 폴더에 복사하시겠습니까?`,
          buttons: ["자원 폴더에 복사", "건너뛰기"],
          cancelId: 1
        })
      ).response !== 0
    )
      return;

    target = (await ipc.invoke("copyInfoAsset", [target]))[0];
  }

  const src = splitPath(target);

  addHistory({
    doFn: ({ src }) => {
      resource.src = src;
    },
    doData: { src },
    undoData: { src: resource.src }
  });
}

export async function selectMany() {
  const result = await ipc.invoke("selectFile", {
    title: "추가할 자원 파일 선택(다중 선택 가능)",
    properties: ["openFile", "multiSelections"]
  });
  return result.canceled ? [] : result.filePaths;
}
