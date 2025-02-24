import { genId } from "./utils";

export default class Node {
    alias = $state();
    constructor(
        type = "sequence",
        { id = genId(), alias = null, color = "green", folded = false, nodePos = { x: 0, y: 0 } }
    ) {
        this.type = type;
        this.id = id;
        this.alias = alias;
        this.color = color;
        this.folded = folded;
        this.nodePos = nodePos;
    }
    get storeData() {
        return { ...this, alias: this.alias };
    }
}
