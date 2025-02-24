import { genId } from "./utils";
import Coord from "./coord";
import Element from "./element.svelte";
import Sortable from "./sortable.svelte";

export default class Component {
    alias = $state();
    zIndex = $state();
    pos = $state();
    visible = $state();
    unbreakable = $state();
    style = $state();
    constructor({
        id = genId(),
        alias = null,
        elements = [],
        pos = {},
        zIndex = null,
        unbreakable = false,
        visible = true,
        style = null
    } = {}) {
        this.id = id;
        this.alias = alias;
        this.elements = new Sortable(elements, Element);
        this.pos = new Coord(pos);
        this.zIndex = zIndex;
        this.unbreakable = unbreakable;
        this.visible = visible;
        this.style = style;
    }
    get storeData() {
        return {
            ...this,
            alias: this.alias,
            zIndex: this.zIndex,
            pos: this.pos,
            unbreakable: this.unbreakable,
            visible: this.visible,
            style: this.style,
            elements: this.elements.storeData
        };
    }
}
