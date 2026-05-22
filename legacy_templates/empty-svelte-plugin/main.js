// @ts-check
/** @typedef {import("@fainthit/repair2-plugin-sdk").RepairElementPluginContext} RepairElementPluginContext */

import "./component.css";

import { mount, unmount } from "svelte";
import { mountCss, destroyCss } from "./styleManager";
import Component from "./Component.svelte";

export default class SveltePlugin extends HTMLElement {
    static attributes = [];

    /**
     * @param {{
     *     attributes?: Record<string, unknown>,
     *     isDev?: boolean,
     *     ctx?: RepairElementPluginContext | null
     * }} options
     */
    constructor({ attributes = {}, isDev = false, ctx = null }) {
        super();
        this.attachShadow({ mode: "open" });
        this.attributesObj = { ...attributes, isDev };
        this.ctx = ctx;
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
                dispatchEvent,
                ctx: this.ctx
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
        this.ctx?.lifecycle?.dispose?.();

        destroyCss(__PLUGIN_NAME__);
    }
}
