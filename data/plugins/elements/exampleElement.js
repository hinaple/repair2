export default class ExampleElement extends HTMLElement {
    static attributes = ["content", "testData"];
    static observedAttributes = ["content"];

    content = "Example Element Plugin";
    constructor({ payloads = {} }) {
        super();
        this.attachShadow({ mode: "open" });
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (name === "content") {
            this.content = newVal;
            this.render();
        }
    }
    render() {
        this.shadowRoot.innerHTML = `
            <div>
                ${this.content}
            </div>
        `;
    }
    connectedCallback() {
        this.content = this.getAttribute("content");
        this.render();
    }
}
