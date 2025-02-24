import Coord from "./coord";
import { genId } from "./utils";

export default class Element {
    alias = $state();
    listeners = $state();
    constructor({ id = genId(), alias = null, pos = {}, type = null, listeners = [] } = {}) {
        this.id = id;
        this.type = type;
        this.alias = alias;
        this.pos = new Coord(pos);
        this.listeners = listeners;
    }
    get storeData() {
        return { ...this, listeners: $state.snapshot(this.listeners) };
    }
}
