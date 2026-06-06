import tippyjs, { Props } from "tippy.js";

export function tippy(node: HTMLElement, opt: Props) {
    const t = tippyjs(node, opt);

    return {
        update(props: Props) {
            t.setProps(props);
        },
        destroy() {
            t.destroy();
        }
    };
}
