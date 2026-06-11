import { mount, unmount } from "svelte";

/** @return {import("@fainthit/repair2-plugin-sdk").FrameExport} */
export default function createFrameExport(Comp) {
    return function ({ attributes, ctx }, { target, children, showIntro }) {
        let component = mount(Comp, {
            target,
            props: {
                attributes,
                ctx,
                root: target,
                slot: (node) => node.append(children)
            },
            intro: showIntro
        });

        return () => {
            if (!component) return;
            unmount(component);
            component = null;
        };
    };
}
