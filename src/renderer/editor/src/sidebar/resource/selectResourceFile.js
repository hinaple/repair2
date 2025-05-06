import { ipcRenderer } from "electron";
import { addHistory } from "../../lib/workHistory";
import { join } from "path";

export const AssetDir = join(ipcRenderer.sendSync("getDataDir"), "assets");

export function splitPath(path) {
    return path.replace(AssetDir, "").replace(/^\\/, "").replace(/\\/g, "/");
}

export async function changeResourceFile(resource) {
    let result = await ipcRenderer.sendSync("selectFile", {
        title: "변경할 자원 파일 선택",
        defaultPath: AssetDir,
        properties: ["openFile"]
    })?.[0];
    if (!result) return;

    if (!result.includes(AssetDir)) {
        if (
            (await ipcRenderer.sendSync("dialogue", {
                type: "question",
                title: "다른 폴더의 파일입니다.",
                message: `${result}\n\n위 파일을 자원 폴더에 복사하시겠습니까?`,
                buttons: ["자원 폴더에 복사", "건너뛰기"],
                cancelId: 1
            })) !== 0
        )
            return;

        result = await ipcRenderer.sendSync("copyInfoAsset", [result])[0];
    }

    const src = splitPath(result);

    addHistory({
        doFn: ({ that, src }) => {
            that.src = src;
        },
        doData: { that: resource, src },
        undoData: { that: resource, src: resource.src }
    });
}

export async function selectMany() {
    const result = await ipcRenderer.sendSync("selectFile", {
        title: "추가할 자원 파일 선택(다중 선택 가능)",
        defaultPath: AssetDir,
        properties: ["openFile", "multiSelections"]
    });
    return result ?? [];
}
