import { get } from "svelte/store";
import { hoverInput } from "./line";

export default function inputNode(node, { id, hasInput = true }) {
    if (!id) return;
    let hasInputNow = hasInput;
    node.addEventListener("mouseenter", () => {
        if (!hasInputNow) return;
        hoverInput.set(id);
    });
    node.addEventListener("mouseleave", () => {
        if (!hasInputNow) return;
        if (get(hoverInput) === id) hoverInput.set(null);
    });
    return {
        update({ hasInput }) {
            hasInputNow = hasInput;
        }
    };
}
