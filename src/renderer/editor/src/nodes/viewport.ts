import { get, writable } from "svelte/store";
import { outClicked } from "../lib/editUtils/contextMenu/contextUtils";
import { getProject } from "../project/store";
import FrameUpdater from "../lib/frameUpdater";
import { ipc } from "../lib/ipc";
import type { Types } from "@shared/projectData/types";

export const rInfo = {
  ratio: 0,
  RW: 0,
  RH: 0
};

let screenRect: {
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
};

interface ScreenData {
  width: number;
  height: number;
  x: number;
  y: number;
  pixelWidth: number;
  pixelHeight: number;
}
export const viewport = {
  screen: writable({ width: 0, height: 0, x: 0, y: 0, pixelWidth: 0, pixelHeight: 0 }),
  size: writable(0),
  pos: writable({ x: 0, y: 0 })
};

let viewportEl: HTMLElement;
export function setViewportEl(node: HTMLElement) {
  viewportEl = node;
  applyViewportWidth();
}
function applyViewportWidth() {
  const screen = get(viewport.screen);
  if (!viewportEl || !screen) return;
  viewportEl.style.width = `${screen.width}px`;
}

const fu = new FrameUpdater(calcRatio);

export const SIDEBAR_WIDTH_MIN = 310;
let SIDEBAR_WIDTH = 340;
export function getSidebarWidth() {
  return SIDEBAR_WIDTH;
}
export function setActualSidebarWidth(sidebarWidth = 0) {
  const prev = SIDEBAR_WIDTH;
  SIDEBAR_WIDTH = Math.min(Math.max(SIDEBAR_WIDTH_MIN, sidebarWidth), screenRect.width - 90);
  const dw = SIDEBAR_WIDTH - prev;
  moveViewport(dw / 2, 0);
  fu.draw();
}

const observer = new ResizeObserver((entries) => {
  if (!entries.length) return;

  const rect = entries[0].contentRect;
  const deviceRect = entries[0].devicePixelContentBoxSize?.[0];

  screenRect = {
    width: rect.width,
    height: rect.height,
    pixelWidth: deviceRect?.inlineSize ?? rect.width,
    pixelHeight: deviceRect?.blockSize ?? rect.height
  };

  fu.draw();
});
observer.observe(document.body);

function calcRatio() {
  if (!screenRect) return;

  const viewportWidth = screenRect.width - SIDEBAR_WIDTH;
  const pw = screenRect.pixelWidth;
  const pwr = pw / screenRect.width;
  const screenObj = {
    width: viewportWidth,
    height: screenRect.height,
    x: SIDEBAR_WIDTH,
    y: 0,
    pixelWidth: viewportWidth * pwr,
    pixelHeight: screenRect.pixelHeight
  };

  rInfo.ratio = Math.pow(10, get(viewport.size));
  rInfo.RW = screenObj.width / rInfo.ratio;
  rInfo.RH = screenObj.height / rInfo.ratio;
  viewport.screen.set(screenObj);

  document.body.style.setProperty("--viewport-ratio", `${rInfo.ratio}`);
  applyViewportWidth();
}

function posFromAnchor(len: number, anchor: number, pos: number) {
  return pos - anchor + len / 2;
}
function removeAnchor(len: number, anchor: number, pos: number) {
  return pos + anchor - len / 2;
}

export function posFromViewport(x: number, y: number, vpPos = get(viewport.pos)) {
  return {
    x: posFromAnchor(rInfo.RW, vpPos.x, x) * rInfo.ratio,
    y: posFromAnchor(rInfo.RH, vpPos.y, y) * rInfo.ratio
  };
}
export function getOriginalPos(x: number, y: number) {
  const vpPos = get(viewport.pos);
  const screen = get(viewport.screen);
  return {
    x: removeAnchor(rInfo.RW, vpPos.x, (x - screen.x) / rInfo.ratio),
    y: removeAnchor(rInfo.RH, vpPos.y, (y - screen.y) / rInfo.ratio)
  };
}

export function moveViewport(dx: number, dy: number) {
  if (Number.isNaN(dx) || Number.isNaN(dy)) return;
  viewport.pos.update((p) => ({
    x: (p.x += dx / rInfo.ratio),
    y: (p.y += dy / rInfo.ratio)
  }));
}

const sizeLimit = [-0.7, 0.5];
export function setViewportSize(size: number, considerLimit = true) {
  if (Number.isNaN(size)) return;
  const newSize = considerLimit ? Math.min(Math.max(size, sizeLimit[0]), sizeLimit[1]) : size;

  outClicked();
  viewport.size.set(newSize);
  calcRatio();
}

export function isBoundOutViewport(x1: number, y1: number, x2: number, y2: number) {
  const screen = get(viewport.screen);

  return screen
    ? ((x1 < 0 && x2 < 0) || (x1 > screen.width && x2 > screen.width)) &&
        ((y1 < 0 && y2 < 0) || (y1 > screen.height && y2 > screen.height))
    : true;
}

export function resizeViewport(step: number, mousePos: { x: number; y: number } | null = null) {
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
export function fitViewportToNodes(nodes: Map<string, Types.Node>) {
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

ipc.on("zoom", (_, step) => {
  const screenSize = get(viewport.screen);
  const center = { x: screenSize.width / 2 + SIDEBAR_WIDTH, y: screenSize.height / 2 };
  resizeViewport(step, center);
});

ipc.on("zoom-fit", () => {
  fitViewportToNodes(getProject().nodes);
});
