export default function outClickAction(node, callback) {
    const handleClick = (e) => {
        if (!node.contains(e.target)) {
            callback();
        }
    };
    document.addEventListener("click", handleClick);
    return {
        destroy: () => document.removeEventListener("click", handleClick)
    };
}
