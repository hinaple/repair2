import FrameUpdater from "./frameUpdater";

const highlights = [];
const currentHighlights = {};

const FU = new FrameUpdater(() => {
    highlights.forEach((h) => {
        if (h.active && currentHighlights[h.type] === h.data) {
            h.node.classList.add("highlight");
            h.node.classList.add(`hl-${h.type}`);
        } else {
            h.node.classList.remove("highlight");
            h.node.classList.remove(`hl-${h.type}`);
        }
    });
});
function activeHighlight(type, data) {
    currentHighlights[type] = data;
    FU.draw();
}
function deactiveHighlight(type) {
    delete currentHighlights[type];
    FU.draw();
}

export function hoverHighlight(node, { type, data }) {
    const mine = { type, data };
    let hovering = false;
    let mouseenter = () => {
        hovering = true;
        activeHighlight(mine.type, mine.data);
    };
    let mouseleave = () => {
        hovering = false;
        deactiveHighlight(mine.type);
    };
    node.addEventListener("mouseenter", mouseenter);
    node.addEventListener("mouseleave", mouseleave);
    return {
        update({ type, data }) {
            if (hovering) deactiveHighlight(mine.type);
            mine.type = type;
            mine.data = data;
            if (hovering) {
                activeHighlight(mine.type, mine.data);
                FU.draw();
            }
        }
    };
}

export default function registerHighlight(node, { type, data, active = false }) {
    const key = Symbol();
    const mine = { node, type, data, key, active };
    highlights.push(mine);
    FU.draw();
    return {
        destroy() {
            highlights.splice(
                highlights.findIndex((h) => h.key === key),
                1
            );
            FU.draw();
        },
        update({ type, data, active }) {
            mine.type = type;
            mine.data = data;
            mine.active = active;
            FU.draw();
        }
    };
}
