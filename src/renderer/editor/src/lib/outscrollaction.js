export default function outClickAction(node, callback) {
    const handleScroll = (e) => {
        if (!node.contains(e.target)) {
            callback();
        }
    };
    document.addEventListener("scroll", handleScroll, true);
    return {
        destroy: () => document.removeEventListener("scroll", handleScroll, true)
    };
}
