import { getOriginalPos } from "../viewport";
import { hoverInput, removeLine, syncLine } from "./line";
import Grabber from "../../lib/grabber";
import { get } from "svelte/store";
import { addHistory } from "../../lib/workHistory";
import { nodeMovedReloader, reload } from "../../lib/stores";
import FrameUpdater from "../../lib/frameUpdater";
import { appData } from "../../lib/syncData.svelte";

export default function outputNode(node, { id, output }) {
    function drawOutputLine() {
        if (!output.to) {
            removeLine(id);
            endPos = null;
            return;
        }
        const connectedNode = appData.findNodeById(output.to);
        endPos = {
            x: connectedNode.nodePos.x,
            y: connectedNode.nodePos.y + (connectedNode.type === "entry" ? 45 : 30) / 2
        };
        syncLine({ fromCoord, toCoord: endPos, fromId: id, output });
    }

    const grabber = new Grabber({
        container: node,
        onMoved: ({ dx, dy }) => {
            endPos.x += dx;
            endPos.y += dy;
            syncLine({ fromCoord, toCoord: endPos, fromId: id, output, noBezier: true });
        },
        onMoveStart: () => (endPos = { x: fromCoord.x, y: fromCoord.y }),
        onMoveEnd: () => {
            const targetEnd = get(hoverInput);
            if (output.to !== targetEnd) {
                addHistory({
                    doFn: (d) => {
                        output.to = d;
                        reload("nodeMoved");
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

    const frameUpdater = new FrameUpdater(async () => {
        if (destroyed) return;
        const rect = node.getBoundingClientRect();
        const originalPos = getOriginalPos(rect.x, rect.y);
        fromCoord = { x: originalPos.x + 16 / 2, y: originalPos.y + 16 / 2 };

        drawOutputLine(id, output);
    }, 1);

    const unsub = nodeMovedReloader.subscribe(() => {
        frameUpdater.draw();
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
