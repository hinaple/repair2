import { appData } from "./syncData.svelte";

function getAllChainedNodeIds(id, nodeConnects, result = new Set()) {
    if (result.has(id)) return;
    result.add(id);

    const connects = nodeConnects.get(id);
    if (!connects) return;
    connects.outs.forEach((o) => getAllChainedNodeIds(o, nodeConnects, result));
    connects.ins.forEach((i) => getAllChainedNodeIds(i, nodeConnects, result));

    return result;
}

export function getAllChainedNodes(node) {
    const c = appData.nodeConnects;
    const ids = getAllChainedNodeIds(node.id, c);
    return ids
        .values()
        .map((i) => appData.findNodeById(i))
        .toArray();
}
