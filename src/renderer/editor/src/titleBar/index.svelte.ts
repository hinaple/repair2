import { fromEditorMenu } from "@shared/editorMenu";
import type { MenuItem } from "../lib/menu/menu.types";
import { clickMenuButton } from "./menuActions";
import { recalcViewport } from "../nodes/viewport";
import FrameUpdater from "../lib/frameUpdater";

export const TitleBarMenu = fromEditorMenu(
  (item, action) =>
    (item.type === "separator"
      ? item
      : {
          label: item.label,
          activate: () => clickMenuButton(action!),
          shortcut: item.shortcut
        }) satisfies MenuItem,
  (m) => m
);

interface WindowControlsOverlayGeometryChangeEvent extends Event {
  readonly visible: boolean;
  readonly titlebarAreaRect: DOMRect;
}

interface WindowControlsOverlay {
  readonly visible: boolean;
  getTitlebarAreaRect(): DOMRect;
  addEventListener(
    type: "geometrychange",
    listener: (this: WindowControlsOverlay, ev: WindowControlsOverlayGeometryChangeEvent) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}

declare global {
  interface Navigator {
    readonly windowControlsOverlay: WindowControlsOverlay;
  }
}

export const titleBar = $state<{
  titlebarRect: DOMRect | null;
  controlBtnWidth: number;
}>({
  titlebarRect: null,
  controlBtnWidth: 0
});

const fu = new FrameUpdater(() => {
  titleBar.controlBtnWidth = window.innerWidth - getTitleBarRect().width;
});

function updateTitleBarRect(rect: DOMRect) {
  titleBar.titlebarRect = rect;
  fu.draw();
}
function updateControlBtnWidth() {
  fu.draw();
}

window.addEventListener("resize", () => {
  updateControlBtnWidth();
});

navigator.windowControlsOverlay.addEventListener("geometrychange", (evt) => {
  updateTitleBarRect(evt.titlebarAreaRect);
  recalcViewport();
});

export function getTitleBarRect() {
  if (!titleBar.titlebarRect)
    updateTitleBarRect(navigator.windowControlsOverlay.getTitlebarAreaRect());

  return titleBar.titlebarRect!;
}

export const TITLEBAR_HEIGHT_OFFSET = 1 / window.devicePixelRatio + 1;
