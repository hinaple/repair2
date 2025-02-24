import { appData } from "./syncData.svelte";

export function getNodeById(id) {
    return appData.nodes.find((s) => s.id === id);
}
