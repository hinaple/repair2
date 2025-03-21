export default class ExampleElement extends HTMLElement {
    static attributes = ["content", "testData"];

    content = "Example Element Plugin";
    constructor() {
        super();
        this.addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("eventChannel"));
        });
    }
    render() {
        this.innerHTML = `
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

customElements.define("example-element", ExampleElement);
