import { getOriginalPos } from "../viewport";
import { hoverInput, removeLine, syncLine } from "./line";
import Grabber from "../../lib/grabber";
import { get } from "svelte/store";
import { getNodeById } from "../../lib/utils";
import { addHistory } from "../../lib/workHistory";
import { nodeMovedReloader } from "../../lib/stores";
import { tick } from "svelte";

export default function outputNode(node, { id, output }) {
    function drawOutputLine() {
        if (!output.to) {
            removeLine(id);
            endPos = null;
            return;
        }
        const tempPos = getNodeById(output.to).nodePos;
        endPos = { x: tempPos.x, y: tempPos.y + 14 };
        syncLine(fromCoord, endPos, id, output);
    }

    const grabber = new Grabber({
        container: node,
        onMoved: ({ dx, dy }) => {
            endPos.x += dx;
            endPos.y += dy;
            syncLine(fromCoord, endPos, id, output);
        },
        onMoveStart: () => (endPos = { x: fromCoord.x, y: fromCoord.y }),
        onMoveEnd: () => {
            const targetEnd = get(hoverInput);
            if (output.to !== targetEnd) {
                addHistory({
                    doFn: (d) => {
                        output.to = d;
                        console.log(output);
                        drawOutputLine();
                    },
                    doData: targetEnd,
                    undoData: output.to
                });
            } else {
                output.to = targetEnd;
                drawOutputLine();
            }
        }
    });

    let endPos;
    let fromCoord;
    function update() {
        if (destroyed) return;
        const rect = node.getBoundingClientRect();
        const originalPos = getOriginalPos(rect.x, rect.y);
        fromCoord = { x: originalPos.x + 14 / 2, y: originalPos.y + 14 / 2 };

        drawOutputLine(id, output);
    }

    const unsub = nodeMovedReloader.subscribe(async () => {
        await tick();
        update();
    });

    let destroyed = false;
    return {
        destroy() {
            destroyed = true;
            if (grabber) grabber.destroy();
            unsub();
            removeLine(id);
        }
    };
}
