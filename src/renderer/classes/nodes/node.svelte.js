import { genId } from "../utils";

export default class Node {
    alias = $state();
    constructor(type = "sequence", { id = genId(), alias = null, nodePos = { x: 0, y: 0 } }) {
        this.type = type;
        this.id = id;
        this.alias = alias;
        this.nodePos = nodePos;
        this.onCreated();
    }
    onCreated() {}

    //#only editor
    get storeData() {
        return { type: this.type, id: this.id, alias: this.alias, nodePos: this.nodePos };
    }
    copyData(availableOuputIds = null) {
        return { type: this.type, alias: this.alias, nodePos: this.nodePos };
    }
    //#endonly
}
