import { get } from "svelte/store";
import { grabbing } from "./stores";
import { rInfo } from "../nodes/viewport";
import FrameUpdater from "./frameUpdater";

type MoveHandler = (moveData: { dx: number; dy: number; px: number; py: number }) => void;
type MoveStartHandler = (moveData: { px: number; py: number }) => void;
type MoveEndHandler = (actuallyMoved: boolean) => void;

export default class Grabber {
  private container: HTMLElement;
  private handle: HTMLElement;
  private pointerdown: (evt: PointerEvent) => void;
  private pointermove: (evt: PointerEvent) => void;
  private pointerup: (evt?: PointerEvent) => void;
  private noHandle: boolean;

  private frameUpdater?: FrameUpdater;
  private realOnmoved: (evt: PointerEvent) => void;
  private pendingEvent?: PointerEvent | null;

  constructor({
    container,
    handle,
    onMoved,
    onMoveStart,
    onMoveEnd,
    inNodeSpace = true,
    noHandle = false,
    optimizedOnMoved = false
  }: {
    container: HTMLElement;
    handle?: HTMLElement;
    onMoved: MoveHandler;
    onMoveStart?: MoveStartHandler;
    onMoveEnd?: MoveEndHandler;
    inNodeSpace?: boolean;
    noHandle?: boolean;
    optimizedOnMoved?: boolean;
  }) {
    this.container = container;
    this.handle = handle ?? container;
    this.noHandle = noHandle;
    const myGrab = Symbol();

    let prvMouse: { x: number; y: number };
    let actuallyMoved = false;

    this.pointerdown = (evt) => {
      if (get(grabbing) || evt.button) return;
      evt.stopPropagation();

      grabbing.set(myGrab);
      this.container.classList.add("grabbing");

      prvMouse = { x: evt.clientX, y: evt.clientY };
      if (onMoveStart) onMoveStart({ px: prvMouse.x, py: prvMouse.y });
    };
    if (!this.noHandle) this.handle.addEventListener("pointerdown", this.pointerdown, true);

    this.pointermove = (evt) => {
      if (get(grabbing) !== myGrab) {
        this.container.classList.remove("grabbing");
        return;
      }
      evt.preventDefault();
      actuallyMoved = true;
      const currentMouse = { x: evt.clientX, y: evt.clientY };
      onMoved({
        dx: (currentMouse.x - prvMouse.x) / (inNodeSpace ? rInfo.ratio : 1),
        dy: (currentMouse.y - prvMouse.y) / (inNodeSpace ? rInfo.ratio : 1),
        px: currentMouse.x,
        py: currentMouse.y
      });
      prvMouse = currentMouse;
    };
    if (optimizedOnMoved) {
      this.frameUpdater = new FrameUpdater(() => {
        if (!this.pendingEvent) return;
        this.pointermove(this.pendingEvent);
        this.pendingEvent = null;
      });

      this.realOnmoved = (evt) => {
        this.pendingEvent = evt;
        this.frameUpdater!.draw();
      };
    } else this.realOnmoved = this.pointermove;
    this.pointerup = (evt) => {
      if (get(grabbing) !== myGrab || (evt && evt.button)) return;

      if (this.pendingEvent) {
        this.pointermove(this.pendingEvent);
        this.pendingEvent = null;
      }
      grabbing.set(null);
      this.container.classList.remove("grabbing");
      if (onMoveEnd) onMoveEnd(actuallyMoved);
      actuallyMoved = false;
    };

    document.body.addEventListener("pointermove", this.realOnmoved, true);
    document.body.addEventListener("pointerup", this.pointerup, true);
  }
  onpointerdown(evt: PointerEvent) {
    this.pointerdown(evt);
  }
  destroy() {
    this.pointerup();
    if (!this.noHandle) this.handle.removeEventListener("pointerdown", this.pointerdown, true);
    document.body.removeEventListener("pointermove", this.realOnmoved, true);
    document.body.removeEventListener("pointerup", this.pointerup, true);
    this.frameUpdater?.destroy();
  }
}
