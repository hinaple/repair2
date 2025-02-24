import { get } from "svelte/store";
import { hoverInput } from "./line";

export default function inputNode(node, id) {
    node.addEventListener("mouseenter", () => {
        hoverInput.set(id);
    });
    node.addEventListener("mouseleave", () => {
        if (get(hoverInput) === id) hoverInput.set(null);
    });
}
