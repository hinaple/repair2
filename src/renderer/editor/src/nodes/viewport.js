import { get, writable } from "svelte/store";
import { outClicked } from "../lib/contextMenu/contextUtils";
import { ipcRenderer } from "electron";
import { appData } from "../lib/syncData.svelte";
import FrameUpdater from "../lib/frameUpdater";

export const rInfo = {
    ratio: 0,
    RW: 0,
    RH: 0
};

let screenRect;
export const viewport = {
    screen: writable({ width: 0, height: 0, pixelWidth: 0, pixelHeight: 0 }),
    size: writable(0),
    pos: writable({ x: 0, y: 0 })
};

export function setViewportEl(node) {
    observer.observe(node, { box: "device-pixel-content-box" });

    return {
        destroy() {
            observer.unobserve(node);
        }
    };
}

const fu = new FrameUpdater(calcRatio);

export const SIDEBAR_WIDTH = 340;
const observer = new ResizeObserver((entries) => {
    if (!entries.length) return;

    const rect = entries[0].contentRect;
    const deviceRect = entries[0].devicePixelContentBoxSize?.[0];
    screenRect = {
        width: rect.width,
        height: rect.height,
        x: SIDEBAR_WIDTH,
        y: 0,
        pixelWidth: deviceRect?.inlineSize ?? rect.width,
        pixelHeight: deviceRect?.blockSize ?? rect.height
    };

    fu.draw();
});

function calcRatio() {
    if (!screenRect) return;

    rInfo.ratio = Math.pow(10, get(viewport.size));
    rInfo.RW = screenRect.width / rInfo.ratio;
    rInfo.RH = screenRect.height / rInfo.ratio;
    viewport.screen.set(screenRect);

    document.body.style.setProperty("--viewport-ratio", rInfo.ratio);
}

function posFromAnchor(len, anchor, pos) {
    return pos - anchor + len / 2;
}
function removeAnchor(len, anchor, pos) {
    return pos + anchor - len / 2;
}

export function posFromViewport(x, y, vpPos = get(viewport.pos)) {
    return {
        x: posFromAnchor(rInfo.RW, vpPos.x, x) * rInfo.ratio,
        y: posFromAnchor(rInfo.RH, vpPos.y, y) * rInfo.ratio
    };
}
export function getOriginalPos(x, y) {
    const vpPos = get(viewport.pos);
    return {
        x: removeAnchor(rInfo.RW, vpPos.x, (x - screenRect?.x ?? 0) / rInfo.ratio),
        y: removeAnchor(rInfo.RH, vpPos.y, (y - screenRect?.y ?? 0) / rInfo.ratio)
    };
}

export function moveViewport(dx, dy) {
    if (Number.isNaN(dx) || Number.isNaN(dy)) return;
    viewport.pos.update((p) => ({
        x: (p.x += dx / rInfo.ratio),
        y: (p.y += dy / rInfo.ratio)
    }));
}

const sizeLimit = [-0.7, 0.5];
export function setViewportSize(size, considerLimit = true) {
    if (Number.isNaN(size)) return;
    const newSize = considerLimit ? Math.min(Math.max(size, sizeLimit[0]), sizeLimit[1]) : size;

    outClicked();
    viewport.size.set(newSize);
    calcRatio();
}

export function isBoundOutViewport(x1, y1, x2, y2) {
    return screenRect
        ? ((x1 < 0 && x2 < 0) || (x1 > screenRect.width && x2 > screenRect.width)) &&
              ((y1 < 0 && y2 < 0) || (y1 > screenRect.height && y2 > screenRect.height))
        : true;
}

export function resizeViewport(step, mousePos = null) {
    if (Number.isNaN(step)) return;

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

const padding = 100;
export function fitViewportToNodes(nodes) {
    if (!nodes || nodes.size === 0) {
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
    bounds.minX -= padding;
    bounds.minY -= padding;
    bounds.maxX += padding;
    bounds.maxY += padding;

    // Calculate center position
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate required scale
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const screenRect = get(viewport.screen);
    const scaleX = Math.log10(screenRect.width / width);
    const scaleY = Math.log10(screenRect.height / height);
    const scale = Math.min(scaleX, scaleY, sizeLimit[1]);

    // Apply new viewport settings
    setViewportSize(scale, false);
    viewport.pos.set({ x: centerX, y: centerY });
}

export function getViewportCenter() {
    const vp = get(viewport.pos);
    return { x: vp.x, y: vp.y };
}

ipcRenderer.on("zoom", (_, step) => {
    const screenSize = get(viewport.screen);
    const center = { x: screenSize.width / 2 + SIDEBAR_WIDTH, y: screenSize.height / 2 };
    resizeViewport(step, center);
});

ipcRenderer.on("zoom-fit", () => {
    if (appData) {
        fitViewportToNodes(appData.nodes);
    }
});
