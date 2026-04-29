import { ipcRenderer } from "electron";
import { updateSaveIdx } from "./workHistory";
import { setViewportSize, viewport } from "../nodes/viewport";
import { get } from "svelte/store";
import { showToast } from "./toast.svelte";
import EditableAppData from "../editableClasses/editableAppData";

import Node from "@classes/nodes/node.svelte";
import { genClipboardFn } from "./clipboard";

Node.prototype.onCreated = function () {
    this.clipboardFn = genClipboardFn(this.type, this, () => appData.removeNode(this), {
        excludes: [(this.type === "branch" || this.type === "entry") && "paste"]
    });
    this.getFocusData = () => {
        return { type: this.type, obj: this, data: { clipboardFn: this.clipboardFn } };
    };
};

const fileData = ipcRenderer.sendSync("request-data");
export const appData = new EditableAppData(fileData);
viewport.pos.set(fileData.viewport?.pos ?? { x: 0, y: 0 });
setViewportSize(fileData.viewport?.size ?? 0);

function getStoreData() {
    const configSD = appData.config.storeData;
    const nodesSD = appData.nodes
        .values()
        .map((s) => s.storeData)
        .toArray();
    const variablesSD = appData.variables.map((v) => v.storeData);
    const resourcesSD = appData.resources.map((r) => r.storeData);
    const viewportSD = { size: get(viewport.size), pos: get(viewport.pos) };

    return {
        config: configSD,
        nodes: nodesSD,
        variables: variablesSD,
        resources: resourcesSD,
        viewport: viewportSD
    };
}

export async function saveData() {
    const storeData = getStoreData();
    console.log("Saved", storeData);
    updateSaveIdx();
    await ipcRenderer.invoke("update-data", storeData);
    showToast({ title: "프로젝트를 저장했습니다.", duration: 2000 });
    return true;
}

ipcRenderer.on("request-save", () => {
    saveData();
});
