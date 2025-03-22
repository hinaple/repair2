import Node from "./node.svelte.js";

export default class AdvancedNode extends Node {
    constructor(type = "sequence", { inputColor = "#000", folded = false, ...nodeData } = {}) {
        super(type, nodeData);
        this.folded = folded;
        this.inputColor = inputColor;
    }
    get storeData() {
        return { folded: this.folded, inputColor: this.inputColor, ...super.storeData };
    }
    get copyData() {
        return { folded: this.folded, inputColor: this.inputColor, ...super.copyData };
    }
}
