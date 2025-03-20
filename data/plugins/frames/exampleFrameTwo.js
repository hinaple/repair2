export default class ExampleFrameTwo extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    render() {
        this.shadowRoot.innerHTML = `
            <div>
                <slot>No content</slot>
            </div>
        `;
    }
    connectedCallback() {
        this.render();
    }
}

customElements.define("example-frame-two", ExampleFrameTwo);
