import { mount, unmount } from "svelte";

/** @return {import("@fainthit/repair2-plugin-sdk").ElementExport} */
export default function createElementExport(Comp) {
    return function ({ attributes, ctx }, { target, dispatchEvent }) {
        let component = mount(Comp, {
            target,
            props: {
                attributes,
                ctx,
                dispatchEvent,
                root: target
            }
        });

        return () => {
            if (!component) return;
            unmount(component);
            component = null;
        };
    };
}
