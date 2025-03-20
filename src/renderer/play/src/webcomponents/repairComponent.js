export default class RepairComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
}

window.customElements.define("repair-component", RepairComponent);
