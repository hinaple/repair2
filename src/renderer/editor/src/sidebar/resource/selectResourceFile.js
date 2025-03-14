import { ipcRenderer } from "electron";
import { addHistory } from "../../lib/workHistory";
import { join } from "path";

export const AssetDir = join(ipcRenderer.sendSync("getDataDir"), "assets");

export function splitPath(path) {
    return path.replace(AssetDir, "").replace(/^\\/, "").replace(/\\/g, "/");
}

export async function changeResourceFile(resource) {
    const result = await ipcRenderer.sendSync("selectFile", {
        title: "변경할 자원 파일 선택",
        defaultPath: AssetDir,
        properties: ["openFile"]
    })?.[0];
    if (!result || !result.includes(AssetDir)) return;

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
