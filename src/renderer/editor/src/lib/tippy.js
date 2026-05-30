import tippyjs from "tippy.js";
import "tippy.js/dist/tippy.css";
import "../tippy.css";

export function tippy(node, opt) {
    const t = tippyjs(node, opt);

    return {
        update(props) {
            t.setProps(props);
        },
        destroy() {
            t.destroy();
        }
    };
}
