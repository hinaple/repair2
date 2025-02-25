import { get } from "svelte/store";
import { grabbing } from "./stores";
import { rInfo } from "../nodes/viewport";

export default class Grabber {
    constructor({ container, handle = null, onMoved, onMoveStart = null, onMoveEnd = null }) {
        this.container = container;
        this.handle = handle ?? container;
        const myGrab = Symbol();

        let prvMouse;
        let actuallyMoved = false;
        this.handle.addEventListener("mousedown", (evt) => {
            if (get(grabbing) || evt.button) return;
            grabbing.set(myGrab);
            this.container.classList.add("grabbing");

            prvMouse = { x: evt.clientX, y: evt.clientY };
            if (onMoveStart) onMoveStart({ px: prvMouse.x, py: prvMouse.y });
        });

        this.mousemove = (evt) => {
            if (get(grabbing) !== myGrab) {
                this.container.classList.remove("grabbing");
                return;
            }
            evt.preventDefault();
            actuallyMoved = true;
            const currentMouse = { x: evt.clientX, y: evt.clientY };
            onMoved({
                dx: (currentMouse.x - prvMouse.x) / rInfo.ratio,
                dy: (currentMouse.y - prvMouse.y) / rInfo.ratio,
                px: currentMouse.x,
                py: currentMouse.y
            });
            prvMouse = currentMouse;
        };
        this.mouseup = (evt) => {
            if (get(grabbing) !== myGrab || (evt && evt.button)) return;
            grabbing.set(null);
            this.container.classList.remove("grabbing");
            if (onMoveEnd) onMoveEnd(actuallyMoved);
            actuallyMoved = false;
        };

        document.body.addEventListener("mousemove", this.mousemove);
        document.body.addEventListener("mouseup", this.mouseup);
    }
    destroy() {
        this.mouseup();
        document.body.removeEventListener("mousemove", this.mousemove);
        document.body.removeEventListener("mouseup", this.mouseup);
    }
}
