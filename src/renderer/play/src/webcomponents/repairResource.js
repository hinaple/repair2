import { getAppData } from "../lib/appdata";
import { genElement } from "../lib/resources";

export default class RepairResource extends HTMLElement {
    static observedAttributes = ["resource-id", "src"];

    constructor(resourceId = null) {
        super();
        if (resourceId) this.setAttribute("resource-id", resourceId);
        this.getUrl();
    }
    getUrl() {
        if (this.getAttribute("resource-id"))
            this.resource = getAppData().findResourceById(this.getAttribute("resource-id"));
        else if (this.getAttribute("src"))
            this.resource = getAppData().findResourceByTitle(this.getAttribute("src"));
        else {
            this.resource = null;
            return;
        }

        this.render();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "resource-id" || name === "src") this.getUrl();
    }
    render() {
        if (!this.isConnected) return;

        this.innerHTML = "";

        if (this.resource) {
            this.child = genElement(this.resource);
            this.appendChild(this.child);
        }
    }
    connectedCallback() {
        this.render();
    }
}

customElements.define("repair-resource", RepairResource);
