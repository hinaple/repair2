import { get } from "svelte/store";
import { grabbing } from "./stores";
import { rInfo } from "../nodes/viewport";

type MoveHandler = (moveData: { dx: number; dy: number; px: number; py: number }) => void;
type MoveStartHandler = (moveData: { px: number; py: number }) => void;
type MoveEndHandler = (actuallyMoved: boolean) => void;

export default class Grabber {
    private container: HTMLElement;
    private handle: HTMLElement;
    private pointerdown: (evt: PointerEvent) => void;
    private pointermove: (evt: PointerEvent) => void;
    private pointerup: (evt?: PointerEvent) => void;

    constructor({
        container,
        handle,
        onMoved,
        onMoveStart,
        onMoveEnd,
        inNodeSpace = true
    }: {
        container: HTMLElement;
        handle?: HTMLElement;
        onMoved: MoveHandler;
        onMoveStart?: MoveStartHandler;
        onMoveEnd?: MoveEndHandler;
        inNodeSpace?: boolean;
    }) {
        this.container = container;
        this.handle = handle ?? container;
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
        this.handle.addEventListener("pointerdown", this.pointerdown, true);

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
        this.pointerup = (evt) => {
            if (get(grabbing) !== myGrab || (evt && evt.button)) return;
            grabbing.set(null);
            this.container.classList.remove("grabbing");
            if (onMoveEnd) onMoveEnd(actuallyMoved);
            actuallyMoved = false;
        };

        document.body.addEventListener("pointermove", this.pointermove, true);
        document.body.addEventListener("pointerup", this.pointerup, true);
    }
    destroy() {
        this.pointerup();
        this.handle.removeEventListener("pointerdown", this.pointerdown, true);
        document.body.removeEventListener("pointermove", this.pointermove, true);
        document.body.removeEventListener("pointerup", this.pointerup, true);
    }
}
