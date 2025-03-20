export default class GameZone extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
}

window.customElements.define("repair-gamezone", GameZone);
