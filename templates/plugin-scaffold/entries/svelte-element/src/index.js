// @ts-check

import "./component.css";

import { mount, unmount } from "svelte";
import Component from "./Component.svelte";

/** @typedef {import("@fainthit/repair2-plugin-sdk").ElementOptions & { isDev?: boolean }} SvelteElementOptions */

export default class SvelteElement extends HTMLElement {
    /** @param {SvelteElementOptions} [options] */
    constructor({ attributes = {}, isDev = false, ctx = null }) {
        super();
        this.attributesObj = { ...attributes, ctx, isDev };
    }

    connectedCallback() {
        if (this.component) return;

        const dispatchEvent = (event, { bubbles = true, detail = null }) => {
            this.dispatchEvent(new CustomEvent(event, { bubbles, detail }));
        };

        this.component = mount(Component, {
            target: this,
            props: {
                ...this.attributesObj,
                root: this,
                dispatchEvent
            }
        });

        this.ctx?.lifecycle?.onDispose?.(() => this.dispose());
    }

    disconnectedCallback() {
        this.dispose();
    }
    dispose() {
        if (!this.component) return;
        unmount(this.component);
        this.component = null;
    }
}
