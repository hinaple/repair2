import "./component.css";

import { mount, unmount } from "svelte";
import Component from "./Component.svelte";

export default class SvelteElement extends HTMLElement {
    /**
     * @param {{
     *     attributes?: Record<string, unknown>,
     *     isDev?: boolean,
     *     ctx?: RepairElementPluginContext | null
     * }} options
     */
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
