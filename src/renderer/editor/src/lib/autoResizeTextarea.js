export default function autoResizeTextarea(node, opt = {}) {
    node.style.overflowY = "hidden";
    node.style.minHeight = `${opt.minHeight}px`;
    node.style.maxHeight = `${opt.maxHeight}px`;
    function resize() {
        node.style.height = `${opt.minHeight}px`;
        node.style.height = `${node.scrollHeight}px`;
    }
    resize();

    node.addEventListener("input", resize);

    return {
        update({ maxHeight, minHeight }) {
            opt.minHeight = minHeight;
            opt.maxHeight = maxHeight;
            node.style.maxHeight = `${opt.maxHeight}px`;
            node.style.minHeight = `${opt.minHeight}px`;
            resize();
        }
    };
}
