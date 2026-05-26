// @ts-check

/** @typedef {import("@fainthit/repair2-plugin-sdk").FrameOptions} FrameOptions */

export default class ExampleElement extends HTMLElement {
    /** @param {FrameOptions} [options] */
    constructor({ attributes, ctx } = {}) {
        super();
        this.ctx = ctx;
        this.attributesData = attributes;
    }

    connectedCallback() {
        const div = document.createElement("div");
        const slot = document.createElement("slot");
        div.append(slot);
        this.append(div);
    }
}
