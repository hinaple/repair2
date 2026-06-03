import { mount, unmount } from "svelte";
import Component from "./Component.svelte";

/** @return {import("@fainthit/repair2-plugin-sdk").ElementExport} */
function createElementExport(Comp) {
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

export default createElementExport(Component);
