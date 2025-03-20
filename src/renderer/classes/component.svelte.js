import { genId } from "./utils";
import Coord from "./coord";
import Element from "./element.svelte";
import Sortable from "./sortable.svelte";
import PluginPointer from "./pluginPointer.svelte";
import Transition from "./transition.svelte";

export default class Component {
    alias = $state();
    zIndex = $state();
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
        style = null,
        frame = {},
        introTransition = {},
        outroTransition = {}
    } = {}) {
        this.id = id;
        this.alias = alias;
        this.elements = new Sortable(elements, Element);
        this.pos = new Coord(pos);
        this.zIndex = zIndex;
        this.unbreakable = unbreakable;
        this.visible = visible;
        this.style = style;
        this.frame = new PluginPointer(frame, "frames");
        this.introTransition = new Transition(introTransition);
        this.outroTransition = new Transition(outroTransition);
    }
    get styleString() {
        return `${this.pos.styleString} z-index: ${this.zIndex ?? 0}; ${this.style ?? ""};`;
    }
    get aliasOrId() {
        return this.alias || this.id;
    }
    get storeData() {
        return {
            ...this,
            alias: this.alias,
            zIndex: this.zIndex,
            pos: this.pos.storeData,
            unbreakable: this.unbreakable,
            visible: this.visible,
            style: this.style,
            elements: this.elements.storeData,
            frame: this.frame.storeData,
            introTransition: this.introTransition.storeData,
            outroTransition: this.outroTransition.storeData
        };
    }
}
