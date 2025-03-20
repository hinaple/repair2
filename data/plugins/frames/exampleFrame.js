export default class ExampleFrame extends HTMLElement {
    static attributes = ["header"];
    static observedAttributes = ["header"];

    header = "Example Frame";
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (name === "header") {
            this.header = newVal;
            this.render();
        }
    }
    render() {
        this.shadowRoot.innerHTML = `
            <div>
                <span>${this.header}</span>
                <slot>No content</slot>
            </div>
        `;
    }
    connectedCallback() {
        this.header = this.getAttribute("header");
        this.render();
    }
}

customElements.define("example-frame", ExampleFrame);
