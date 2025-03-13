import { get, writable } from "svelte/store";

export const lines = writable([]);
export const hoverInput = writable(null);

export function syncLine({
    fromCoord,
    toCoord,
    fromId,
    output,
    isHeadingBottom = true,
    noBezier = false
} = {}) {
    const prvLine = get(lines).findIndex((l) => l.fromId === fromId);
    if (prvLine !== -1)
        lines.update((arr) =>
            arr.toSpliced(prvLine, 1, {
                output,
                fromId,
                fromCoord,
                toCoord,
                isHeadingBottom,
                noBezier
            })
        );
    else
        lines.update((arr) => [
            ...arr,
            { output, fromId, fromCoord, toCoord, isHeadingBottom, noBezier }
        ]);
}
export function removeLine(fromId) {
    const targetIdx = get(lines).findIndex((l) => l.fromId === fromId);
    if (targetIdx === -1) return;
    lines.update((arr) => arr.toSpliced(targetIdx, 1));
}
export function getAllConnectedNodes(nodeId) {
    return get(lines).filter((l) => l.output.to === nodeId);
}
export function setAllOutput(lines, toId = null) {
    lines.forEach((l) => (l.output.to = toId));
}
