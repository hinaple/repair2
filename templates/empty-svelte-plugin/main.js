import "./component.css";

import { mount, unmount } from "svelte";
import { mountCss, destroyCss } from "./styleManager";
import Component from "./Component.svelte";

export default class SveltePlugin extends HTMLElement {
    static attributes = [];

    constructor({ attributes = {}, isDev = false }) {
        super();
        this.attachShadow({ mode: "open" });
        this.attributesObj = { ...attributes, isDev };
    }

    connectedCallback() {
        const dispatchEvent = (event, detail = null) => {
            this.shadowRoot.dispatchEvent(
                new CustomEvent(event, { composed: true, detail: detail })
            );
        };

        this.component = mount(Component, {
            target: this.shadowRoot,
            props: {
                ...this.attributesObj,
                root: this.shadowRoot,
                dispatchEvent
            }
        });

        // DO NOT EDIT BELOW UNLESS YOU KNOW WHAT IT DOES
        const mountCssFn = () => {
            destroyCss(__PLUGIN_NAME__);
            destroyCss(__PLUGIN_NAME__, this.shadowRoot);
            mountCss(__PLUGIN_NAME__, globalThis.InjectingCss[__PLUGIN_NAME__], this.shadowRoot);
        };
        mountCssFn();
        if (this.attributesObj.isDev) {
            globalThis.SveltePluginStyleReload = mountCssFn;
        }
    }

    disconnectedCallback() {
        if (this.component) unmount(this.component);
        this.component = null;

        destroyCss(__PLUGIN_NAME__);
    }
}
