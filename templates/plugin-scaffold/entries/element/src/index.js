export default class ExampleElement extends HTMLElement {
    constructor({ attributes, ctx } = {}) {
        super();
        this.ctx = ctx;
        this.attributesData = attributes;
    }

    connectedCallback() {
        this.textContent = "Example element";
    }
}
