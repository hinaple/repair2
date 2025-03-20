import { get, writable } from "svelte/store";
import { outClicked } from "../lib/contextMenu/contextUtils";
import { ipcRenderer } from "electron";
import { appData } from "../lib/syncData.svelte";

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
export function setViewportSize(size, considerLimit = true) {
    const newSize = considerLimit ? Math.min(Math.max(size, sizeLimit[0]), sizeLimit[1]) : size;

    outClicked();
    viewport.size.set(newSize);
    calcRatio();
}

export function resizeViewport(step, mousePos = null) {
    const prevSize = get(viewport.size);
    const newSize = get(viewport.size) + step * 0.1;

    if (mousePos && prevSize !== newSize) {
        const realPos = getOriginalPos(mousePos.x, mousePos.y);

        setViewportSize(newSize, true);

        const newRealPos = getOriginalPos(mousePos.x, mousePos.y);

        viewport.pos.update((p) => ({
            x: p.x + (realPos.x - newRealPos.x),
            y: p.y + (realPos.y - newRealPos.y)
        }));
    } else {
        setViewportSize(newSize, true);
    }
}

export function fitViewportToNodes(nodes) {
    if (!nodes || nodes.length === 0) {
        setViewportSize(0);
        viewport.pos.set({ x: 0, y: 0 });
        return;
    }

    // Calculate bounds
    const bounds = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity
    };

    nodes.forEach((node) => {
        const pos = node.nodePos;
        bounds.minX = Math.min(bounds.minX, pos.x);
        bounds.minY = Math.min(bounds.minY, pos.y);
        bounds.maxX = Math.max(bounds.maxX, pos.x);
        bounds.maxY = Math.max(bounds.maxY, pos.y);
    });

    // Add padding
    const padding = 100;
    const sideBarWidth = 300;
    bounds.minX -= padding;
    bounds.minY -= padding;
    bounds.maxX += padding + sideBarWidth;
    bounds.maxY += padding;

    // Calculate center position
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate required scale
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const screenSize = get(viewport.screen);
    const scaleX = Math.log10(screenSize.width / width);
    const scaleY = Math.log10(screenSize.height / height);
    const scale = Math.min(scaleX, scaleY, sizeLimit[1]);

    // Apply new viewport settings
    setViewportSize(scale, false);
    viewport.pos.set({ x: centerX, y: centerY });
}

window.onresize = () => {
    calcRatio();
};

ipcRenderer.on("zoom", (_, step) => {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    resizeViewport(step, center);
});

ipcRenderer.on("zoom-fit", () => {
    if (appData) {
        fitViewportToNodes(appData.nodes);
    }
});
