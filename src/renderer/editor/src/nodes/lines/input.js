import { get } from "svelte/store";
import { hoverInput } from "./line";

export default function inputNode(node, id) {
    if (!id) return;
    node.addEventListener("mouseenter", () => {
        hoverInput.set(id);
    });
    node.addEventListener("mouseleave", () => {
        if (get(hoverInput) === id) hoverInput.set(null);
    });
}
