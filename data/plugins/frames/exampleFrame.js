export default class ExampleFrame extends HTMLElement {
    static attributes = ["title"];
    static observedAttributes = ["title"];

    title = "Example Frame";
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (name === "title") {
            this.title = newVal;
            this.render();
        }
    }
    render() {
        this.shadowRoot.innerHTML = `
            <div>
                ${this.title}
                <slot>No content</slot>
            </div>
        `;
    }
    connectedCallback() {
        this.title = this.getAttribute("title");
        this.render();
    }
}
