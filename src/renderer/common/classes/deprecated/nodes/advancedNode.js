import Node from "./node.svelte.js";

export default class AdvancedNode extends Node {
    constructor(type = "sequence", { inputColor = "#000", folded = false, ...nodeData } = {}) {
        super(type, nodeData);
        this.folded = folded;
        this.inputColor = inputColor;
    }

    //#only editor
    get storeData() {
        return { folded: this.folded, inputColor: this.inputColor, ...super.storeData };
    }
    copyData(availableOuputIds = null) {
        return { folded: this.folded, inputColor: this.inputColor, ...super.copyData() };
    }
    //#endonly
}
