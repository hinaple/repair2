import { mount, unmount } from "svelte";
import Component from "./Component.svelte";

/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport} */
export default function ({ attributes, ctx }, { target, dispatchEvent }) {
    let component = mount(Component, {
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
}
