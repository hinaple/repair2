import * as Easing from "easing-utils";
import { getAppData } from "./appdata";

function getDistance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export default class Dragger {
    constructor(dragOption, node, { setPos, setPosAsDefault }) {
        if (!dragOption.use) return;

        this.dragOption = dragOption;
        this.node = node;

        const ratio = getAppData()
            .config.sizeRatio.split(",")
            .map((n) => +n);
        const screenRatio = ratio.length
            ? { x: ratio[0], y: ratio[1] ?? ratio[0] }
            : { x: 1, y: 1 };

        if (dragOption.hotspots.length) {
            requestAnimationFrame(() => {
                const tempHotspots = dragOption.hotspots.map((coord) => {
                    setPos(coord);
                    return this.getCurrentRect();
                });
                setPosAsDefault();
                const defaultPos = this.getCurrentRect();
                this.hotspotsPos = tempHotspots.map(({ x, y }) => ({
                    x: (x - defaultPos.x) / screenRatio.x,
                    y: (y - defaultPos.y) / screenRatio.y
                }));
                this.beforeTransform = getComputedStyle(node).transform;
            });
        }

        let dragging = false;
        let currentPos = { x: 0, y: 0 };
        let startPos = null;

        let rendering = false;
        let renderStartedAt = null;
        const Snap = {
            snapping: false,
            startedPos: null,
            startedAt: null,
            duration: null,
            renderPos: null
        };
        const render = (ts = null) => {
            if (ts === null) renderStartedAt = -1;
            else if (renderStartedAt === -1) renderStartedAt = ts;

            const time = ts === null ? 0 : ts - renderStartedAt;
            if (Snap.snapping && !Snap.startedAt) Snap.startedAt = time;

            if (!rendering) return;
            if (!dragging && !Snap.snapping) rendering = false;

            if (Snap.snapping) {
                const t = Math.min(1, (time - Snap.startedAt) / Snap.duration);
                const eased = (Easing[dragOption.moveEasing] ?? Easing.linear)(t);
                Snap.renderPos = {
                    x: Snap.startedPos.x + (currentPos.x - Snap.startedPos.x) * eased,
                    y: Snap.startedPos.y + (currentPos.y - Snap.startedPos.y) * eased
                };
                this.setTransformPos(Snap.renderPos);
                if (t >= 1) endSnap();
            } else this.setTransformPos(currentPos);

            requestAnimationFrame(render);
        };
        const startSnap = (duration) => {
            if (Snap.snapping) cancelSnap();
            node.classList.add("snapping");
            Snap.snapping = true;
            Snap.startedPos = { ...currentPos };
            Snap.startedAt = null;
            Snap.duration = duration;
        };
        const endSnap = () => {
            Snap.snapping = false;
            node.classList.remove("snapping");
        };
        const cancelSnap = () => {
            if (!Snap.snapping) return;
            currentPos = Snap.renderPos;
            endSnap();
        };

        node.addEventListener("mousedown", (evt) => {
            dragging = true;
            rendering = true;
            cancelSnap();
            node.classList.add("dragging");
            startPos = {
                x: evt.screenX - currentPos.x * screenRatio.x,
                y: evt.screenY - currentPos.y * screenRatio.y
            };
            render();
        });
        let currentHotspot = -1;
        this.mousemove = document.addEventListener("mousemove", (evt) => {
            if (!dragging) return;
            const realPos = {
                x: (evt.screenX - startPos.x) / screenRatio.x,
                y: (evt.screenY - startPos.y) / screenRatio.y
            };
            if (dragOption.snapOn === "drag") {
                const tempHotspot = this.getTouchingHotspot(realPos);
                if (currentHotspot !== tempHotspot) {
                    startSnap(dragOption.snapDuration ?? 100);
                }
                currentHotspot = tempHotspot;
                if (tempHotspot !== -1) {
                    currentPos = this.hotspotsPos[tempHotspot];
                    return;
                }
            }
            currentPos = realPos;
        });
        this.mouseup = document.addEventListener("mouseup", (evt) => {
            if (!dragging) return;
            const realPos = {
                x: (evt.screenX - startPos.x) / screenRatio.x,
                y: (evt.screenY - startPos.y) / screenRatio.y
            };
            currentHotspot = this.getTouchingHotspot(realPos);
            node.dispatchEvent(
                new CustomEvent("released", {
                    detail: currentHotspot === -1 ? {} : { hotspotIndex: currentHotspot }
                })
            );
            if (currentHotspot !== -1 && dragOption.snapOn !== "never") {
                startSnap(dragOption.snapDuration ?? 100);
                currentPos = this.hotspotsPos[currentHotspot];
                dragging = false;
                return;
            }
            currentPos = realPos;

            if (dragOption.returnOnRelease) {
                startSnap(dragOption.returnDuration ?? 100);
                currentPos = { x: 0, y: 0 };
            }

            dragging = false;
            node.classList.remove("dragging");
        });
        document.addEventListener("mousemove", this.mousemove);
        document.addEventListener("mouseup", this.mouseup);

        this.currentSnap = null;
    }
    getTouchingHotspot(pos, threshold = this.dragOption.threshold) {
        return this.hotspotsPos.findIndex((hs) => getDistance(pos, hs) <= threshold);
    }
    getTransformCode({ x, y }) {
        return (
            `translate(${x}px, ${y}px) ` +
            (this.beforeTransform && this.beforeTransform !== "none" ? this.beforeTransform : "")
        );
    }
    setTransformPos(pos) {
        this.node.style.transform = this.getTransformCode(pos);
    }
    getCurrentRect() {
        const rect = this.node.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }
    destroy() {
        document.removeEventListener("mousemove", this.mousemove);
        document.removeEventListener("mouseup", this.mouseup);
    }
}
