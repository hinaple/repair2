import "./component.css";

import { mount, unmount } from "svelte";
import Component from "./Component.svelte";

export default class SveltePlugin extends HTMLElement {
    static attributes = [];

    constructor({ attributes = {}, isDev = false }) {
        super();
        this.attachShadow({ mode: "open" });
        this.attributesObj = { ...attributes, isDev };
    }

    connectedCallback() {
        this.component = mount(Component, {
            target: this.shadowRoot,
            props: this.attributesObj
        });

        // DO NOT EDIT BELOW UNLESS YOU KNOW WHAT IT DOES
        if (globalThis.InjectingCss) {
            globalThis.InjectingCss.forEach((css) => {
                const style = document.createElement("style");
                style.appendChild(document.createTextNode(css));
                this.shadowRoot.appendChild(style);
            });
        }
    }

    disconnectedCallback() {
        if (this.component) unmount(this.component);
        this.component = null;
    }
}
