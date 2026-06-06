export default function event(node, [type, callback, option]) {
    node.addEventListener(type, callback, option);

    return {
        destroy() {
            node.removeEventListener(type, callback, option);
        }
    };
}
