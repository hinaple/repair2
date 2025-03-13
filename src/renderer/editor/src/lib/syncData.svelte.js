import { ipcRenderer } from "electron";
import { addHistory, updateSaveIdx } from "./workHistory";
import { setViewportSize, viewport } from "../nodes/viewport";
import { get } from "svelte/store";
import { getAllConnectedNodes, setAllOutput } from "../nodes/lines/line";
import { reload } from "./stores";
import AppData from "@classes/appData.svelte";

const fileData = ipcRenderer.sendSync("request-data");
export const appData = new AppData(fileData);
viewport.pos.set(fileData.viewport?.pos ?? { x: 0, y: 0 });
setViewportSize(fileData.viewport?.size ?? 0);

function getStoreData() {
    const configSD = appData.config.storeData;
    const nodesSD = appData.nodes.map((s) => s.storeData);
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

export function saveData() {
    const storeData = getStoreData();
    console.log("Saved", storeData);
    ipcRenderer.send("update-data", storeData);
    updateSaveIdx();
}

export function removeNodeWithHistory(node) {
    const currentIdx = appData.nodes.findIndex((s) => s.id === node.id);
    const connectedNodes = getAllConnectedNodes(node.id);
    addHistory({
        doFn: ({ idx, nodes }) => {
            appData.nodes = appData.nodes.toSpliced(idx, 1);
            setAllOutput(nodes, null);
            reload("nodeMoved");
        },
        undoFn: ({ node, idx, nodes }) => {
            appData.nodes = appData.nodes.toSpliced(idx, 0, node);
            setAllOutput(nodes, node.id);
            reload("nodeMoved");
        },
        doData: { idx: currentIdx, nodes: connectedNodes },
        undoData: { node, idx: currentIdx, nodes: connectedNodes }
    });
}

ipcRenderer.on("request-save", saveData);
