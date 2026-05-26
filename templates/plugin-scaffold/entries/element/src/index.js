// @ts-check

/** @typedef {import("@fainthit/repair2-plugin-sdk").ElementOptions} ElementOptions */

export default class ExampleElement extends HTMLElement {
    /** @param {ElementOptions} [options] */
    constructor({ attributes, ctx } = {}) {
        super();
        this.ctx = ctx;
        this.attributesData = attributes;
    }

    connectedCallback() {
        this.textContent = "Example element";
    }
}
