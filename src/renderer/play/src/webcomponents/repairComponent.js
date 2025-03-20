import RepairElement from "./repairElement";

export default class RepairComponent extends HTMLElement {
    constructor(componentData) {
        super();
        this.setAttribute("style", `position: absolute; ${componentData.styleString}`);
        this.componentId = componentData.aliasOrId;
        this.realId = componentData.id;

        this.visible = componentData.visible;
        this.unbreakable = componentData.unbreakable;

        this.container = this;
        const tempFrame = componentData.frame.use();
        if (tempFrame === "importing") {
            componentData.frame.promise.then(() => {
                const tempFrame = componentData.frame.use();
                if (!tempFrame) return;
                this.container = tempFrame;
                this.appendChild(this.container);

                if (!this.isConnected) return;
                this.render();
            });
        } else if (tempFrame) {
            this.container = tempFrame;
            this.appendChild(this.container);
        }

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
