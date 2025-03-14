import { genId } from "../utils";

export default class Node {
    alias = $state();
    constructor(type = "sequence", { id = genId(), alias = null, nodePos = { x: 0, y: 0 } }) {
        this.type = type;
        this.id = id;
        this.alias = alias;
        this.nodePos = nodePos;
    }
    get storeData() {
        return { ...this, alias: this.alias };
    }
}
