import { mount, unmount } from "svelte";
import Component from "./Component.svelte";

/** @type {import("@fainthit/repair2-plugin-sdk").FrameExport} */
export default function ({ attributes, ctx }, { target, children, showIntro }) {
    let component = mount(Component, {
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
}
