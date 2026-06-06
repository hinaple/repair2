export default function outScrollAction(node, callback) {
    const handleScroll = (e) => {
        if (!node.contains(e.target)) {
            callback();
        }
    };
    const opt = ["scroll", handleScroll, { capture: true, passive: true }];
    document.addEventListener(...opt);
    return {
        destroy: () => document.removeEventListener(...opt)
    };
}
