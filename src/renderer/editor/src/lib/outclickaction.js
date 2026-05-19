export default function outClickAction(node, arg) {
    if (typeof arg === "function") arg = { callback: arg, excludes: [] };
    const { callback, excludes } = arg;

    const handleDown = (e) => {
        if (!node.contains(e.target) && !excludes.some((ex) => ex.contains(e.target))) {
            callback();
        }
    };
    document.addEventListener("pointerdown", handleDown);
    return {
        destroy: () => document.removeEventListener("pointerdown", handleDown)
    };
}
