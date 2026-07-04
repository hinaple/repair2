import * as Easing from "easing-utils";
import { getSizeRatio } from "../project";
import type { Types } from "@shared/projectData/types";

interface Coord {
    x: number;
    y: number;
}
function getDistance(a: Coord, b: Coord) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export default class Dragger {
    private dragOption?: Extract<Types.DragOption, { use: true }>;
    private hotspotsPos?: Coord[];
    private beforeTransform?: string;
    private pointermove?: (evt: any) => void;
    private pointerup?: (evt: any) => void;
    constructor(
        dragOption: Types.DragOption,
        private node: HTMLElement,
        {
            setPos,
            setPosAsDefault
        }: {
            setPos(coord: Types.Coord): void;
            setPosAsDefault(): void;
        }
    ) {
        if (!dragOption.use) return;

        this.dragOption = dragOption;

        const ratio = getSizeRatio();
        const screenRatio = { x: ratio[0], y: ratio[1] };

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

        let dragging: boolean = false;
        let currentPos: Coord = { x: 0, y: 0 };
        let startPos: Coord;

        let rendering = false;
        let renderStartedAt: number;
        const Snap: {
            snapping: boolean;
            startedPos?: Coord;
            startedAt?: number;
            duration?: number;
            renderPos?: Coord;
        } = {
            snapping: false
        };
        const render = (ts?: number) => {
            if (typeof ts !== "number") renderStartedAt = -1;
            else if (renderStartedAt === -1) renderStartedAt = ts;

            const time = typeof ts !== "number" ? 0 : ts - renderStartedAt;
            if (Snap.snapping && !Snap.startedAt) Snap.startedAt = time;

            if (!rendering) return;
            if (!dragging && !Snap.snapping) rendering = false;

            if (Snap.snapping) {
                const t = Math.min(1, (time - Snap.startedAt!) / Snap.duration!);
                const eased = (
                    dragOption.moveEasing in Easing
                        ? (Easing as Record<string, (t: number) => number>)[dragOption.moveEasing]
                        : Easing.linear
                )(t);
                Snap.renderPos = {
                    x: Snap.startedPos!.x + (currentPos.x - Snap.startedPos!.x) * eased,
                    y: Snap.startedPos!.y + (currentPos.y - Snap.startedPos!.y) * eased
                };
                this.setTransformPos(Snap.renderPos);
                if (t >= 1) endSnap();
            } else {
                this.setTransformPos(currentPos);
            }

            requestAnimationFrame(render);
        };
        const startSnap = (duration: number) => {
            if (Snap.snapping) cancelSnap();
            node.classList.add("snapping");
            Snap.snapping = true;
            Snap.startedPos = { ...currentPos };
            delete Snap.startedAt;
            Snap.duration = duration;
        };
        const endSnap = () => {
            Snap.snapping = false;
            node.classList.remove("snapping");
        };
        const cancelSnap = () => {
            if (!Snap.snapping) return;
            currentPos = Snap.renderPos!;
            endSnap();
        };

        node.addEventListener("pointerdown", (evt) => {
            if (dragging) return;
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
        this.pointermove = (evt) => {
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
                    currentPos = this.hotspotsPos![tempHotspot];
                    return;
                }
            }
            currentPos = realPos;
        };
        this.pointerup = (evt) => {
            if (!dragging) return;
            const realPos = {
                x: (evt.screenX - startPos.x) / screenRatio.x,
                y: (evt.screenY - startPos.y) / screenRatio.y
            };
            currentHotspot = this.getTouchingHotspot(realPos);
            node.dispatchEvent(
                new CustomEvent("dragreleased", {
                    detail: currentHotspot === -1 ? {} : { hotspotIndex: currentHotspot }
                })
            );
            node.classList.remove("dragging");
            if (currentHotspot !== -1 && dragOption.snapOn !== "never") {
                startSnap(dragOption.snapDuration ?? 100);
                currentPos = this.hotspotsPos![currentHotspot];
                dragging = false;
                return;
            }
            currentPos = realPos;

            if (dragOption.returnOnRelease) {
                startSnap(dragOption.returnDuration ?? 100);
                currentPos = { x: 0, y: 0 };
                node.dispatchEvent(
                    new CustomEvent("dragreturn", {
                        detail: currentHotspot === -1 ? {} : { hotspotIndex: currentHotspot }
                    })
                );
            }

            dragging = false;
        };
        document.addEventListener("pointermove", this.pointermove);
        document.addEventListener("pointerup", this.pointerup);

        // this.currentSnap = null;
    }
    getTouchingHotspot(pos: Coord, threshold = this.dragOption?.threshold ?? 0) {
        return this.hotspotsPos?.findIndex((hs) => getDistance(pos, hs) <= threshold) ?? -1;
    }
    getTransformCode({ x, y }: Coord) {
        return (
            `translate(${x}px, ${y}px) ` +
            (this.beforeTransform && this.beforeTransform !== "none" ? this.beforeTransform : "")
        );
    }
    setTransformPos(pos: Coord) {
        this.node.style.transform = this.getTransformCode(pos);
    }
    getCurrentRect() {
        const rect = this.node.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }
    destroy() {
        if (this.pointermove) document.removeEventListener("pointermove", this.pointermove);
        if (this.pointerup) document.removeEventListener("pointerup", this.pointerup);
    }
}
