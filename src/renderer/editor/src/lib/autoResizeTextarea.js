export default function autoResizeTextarea(node, opt = { minHeight: 100 }) {
    node.style.overflowY = "hidden";
    if (opt.minHeight) node.style.minHeight = `${opt.minHeight}px`;
    if (opt.maxHeight) node.style.maxHeight = `${opt.maxHeight}px`;
    function resize() {
        node.style.height = `${opt.minHeight ?? 50}px`;
        node.style.height = `${node.scrollHeight}px`;
    }
    resize();

    node.addEventListener("input", resize);

    return {
        update({ maxHeight = 100, minHeight }) {
            opt.minHeight = minHeight;
            opt.maxHeight = maxHeight;
            if (opt.maxHeight) node.style.maxHeight = `${opt.maxHeight}px`;
            if (opt.minHeight) node.style.minHeight = `${opt.minHeight}px`;
            resize();
        }
    };
}
