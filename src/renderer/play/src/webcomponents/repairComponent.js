import RepairElement from "./repairElement";
import { packageLoader } from "../lib/plugin-package-loader.js";

export default class RepairComponent extends HTMLElement {
    constructor(componentData) {
        super();
        this.setAttribute("style", `position: absolute; ${componentData.styleString}`);
        this.componentId = componentData.aliasOrId;
        this.realId = componentData.id;

        this.visible = componentData.visible;
        this.unbreakable = componentData.unbreakable;

        this.container = this;
        componentData.frame.use(packageLoader).then((tempFrame) => {
            if (!tempFrame) return;
            this.container = tempFrame;
            this.appendChild(this.container);

            if (!this.isConnected) return;
            this.render();
        });

        this.elements = componentData.elements.list.map((e) => new RepairElement(e));
    }

    render() {
        this.elements.forEach((el) => this.container.appendChild(el));
    }

    connectedCallback() {
        this.render();
    }
}

window.customElements.define("repair-component", RepairComponent);
