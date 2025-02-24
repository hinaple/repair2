import { get, writable } from "svelte/store";
import { outClicked } from "../lib/contextMenu/contextUtils";

export const rInfo = {
    ratio: 0,
    RW: 0,
    RH: 0
};

export const viewport = {
    screen: writable({ width: 0, height: 0 }),
    size: writable(0),
    pos: writable({ x: 0, y: 0 })
};

function calcRatio() {
    const screenSize = { width: window.innerWidth, height: window.innerHeight };
    rInfo.ratio = Math.pow(10, get(viewport.size));
    rInfo.RW = screenSize.width / rInfo.ratio;
    rInfo.RH = screenSize.height / rInfo.ratio;
    viewport.screen.set(screenSize);

    document.body.style.setProperty("--viewport-ratio", rInfo.ratio);
}
calcRatio();

function posFromAnchor(len, anchor, pos) {
    return pos - anchor + len / 2;
}
function removeAnchor(len, anchor, pos) {
    return pos + anchor - len / 2;
}

export function posFromViewport(x, y) {
    const vpPos = get(viewport.pos);
    return {
        x: posFromAnchor(rInfo.RW, vpPos.x, x) * rInfo.ratio,
        y: posFromAnchor(rInfo.RH, vpPos.y, y) * rInfo.ratio
    };
}
export function getOriginalPos(x, y) {
    const vpPos = get(viewport.pos);
    return {
        x: removeAnchor(rInfo.RW, vpPos.x, x / rInfo.ratio),
        y: removeAnchor(rInfo.RH, vpPos.y, y / rInfo.ratio)
    };
}

export function moveViewport(dx, dy) {
    const ratio = Math.pow(10, get(viewport.size));
    viewport.pos.update((p) => ({
        x: (p.x += dx / ratio),
        y: (p.y += dy / ratio)
    }));
}

const sizeLimit = [-0.7, 0.5];
export function setViewportSize(size) {
    viewport.size.set(size);
    calcRatio();
    outClicked();
}
export function resizeViewport(step) {
    viewport.size.update((s) => {
        const result = s + step * 0.1;
        return sizeLimit[0] > result || sizeLimit[1] < result ? s : result;
    });
    calcRatio();
    outClicked();
}

window.onresize = () => {
    calcRatio();
};
