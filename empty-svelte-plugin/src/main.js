import { mount, unmount } from "svelte";
import Component from "./Component.svelte";

export default class SveltePlugin extends HTMLElement {
    static attributes = [];

    constructor({ attributes = {} }) {
        super();
        this.attachShadow({ mode: "open" });
        this.attributesObj = attributes;
    }

    connectedCallback() {
        this.component = mount(Component, {
            target: this.shadowRoot,
            props: this.attributesObj
        });

        if (globalThis.InjectingCss) {
            const style = document.createElement("style");
            style.appendChild(document.createTextNode(InjectingCss));
            this.shadowRoot.appendChild(style);
        }
    }

    disconnectedCallback() {
        if (this.component) unmount(this.component);
        this.component = null;
    }
}
