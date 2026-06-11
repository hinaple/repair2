import type { Action } from "svelte/action";
import Grabber from "../../lib/grabber";

export const sidebar: Action<
    HTMLElement,
    {
        actualSetter: (width: number) => void;
        movingSetter?: (width: number) => void;
        onMoveEnd?: (width: number) => void;
        currentWidth?: (() => number) | number;
        handleWidth?: number;
    }
> = (
    node,
    { actualSetter, movingSetter = actualSetter, onMoveEnd, currentWidth, handleWidth = 6 }
) => {
    node.classList.add("resizable");

    const resizer = document.createElement("div");
    resizer.classList.add("resizer");
    resizer.style.setProperty("--width", `${handleWidth}px`);
    node.append(resizer);

    const getCurrentWidth =
        currentWidth !== undefined
            ? typeof currentWidth === "number"
                ? () => currentWidth
                : currentWidth
            : () => node.getBoundingClientRect().width;
    let w: number;

    const grabber = new Grabber({
        container: resizer,
        onMoveStart: () => {
            w = getCurrentWidth();
            actualSetter(0);
        },
        onMoved: ({ dx }) => {
            w += dx;
            movingSetter(w);
        },
        onMoveEnd: () => {
            actualSetter(w);
            onMoveEnd?.(w);
        },
        inNodeSpace: false
    });

    return {
        destroy: () => grabber.destroy()
    };
};
