export default class ExampleElement extends HTMLElement {
    static attributes = ["content", "testData"];

    static dependencies = {
        "lodash-es": "latest"
    };

    content = "Example Element Plugin";
    constructor({ modules = {} }) {
        super();
        this._ = modules["lodash-es"];
        this.addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("eventChannel"));
        });
        this.connectedCallback();
    }

    connectedCallback() {
        this.content = this._.get(this, 'getAttribute("content")', "Default Content");
        this.render();
    }

    render() {
        this.innerHTML = `
            <div>
                ${this.content}
            </div>
        `;
    }
}

customElements.define("example-element", ExampleElement);
