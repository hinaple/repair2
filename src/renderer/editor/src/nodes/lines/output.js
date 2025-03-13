import { getOriginalPos } from "../viewport";
import { hoverInput, removeLine, syncLine } from "./line";
import Grabber from "../../lib/grabber";
import { get } from "svelte/store";
import { getNodeById } from "../../lib/utils";
import { addHistory } from "../../lib/workHistory";
import { nodeMovedReloader, reload } from "../../lib/stores";
import FrameUpdater from "../../lib/frameUpdater";

export default function outputNode(node, { id, output, isHeadingBottom = true }) {
    function drawOutputLine() {
        if (!output.to) {
            removeLine(id);
            endPos = null;
            return;
        }
        const tempPos = getNodeById(output.to).nodePos;
        endPos = { x: tempPos.x, y: tempPos.y + 14 };
        syncLine({ fromCoord, toCoord: endPos, fromId: id, output, isHeadingBottom });
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
        fromCoord = { x: originalPos.x + 14 / 2, y: originalPos.y + 14 / 2 };

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
