import Coord from "./coord";
import Listener from "./listener.svelte";
import Sortable from "./sortable.svelte";
import TypePayload from "./typePayload.svelte";
import { genId } from "./utils";

const PayloadTemplates = {
    image: { resource: null },
    video: { resource: null },
    input: { variable: null, placeholder: null, autofocus: false, allowedRegex: null },
    empty: { content: null }
};

export default class Element extends TypePayload {
    alias = $state();
    width = $state();
    height = $state();
    style = $state();
    absolute = $state();
    constructor({
        id = genId(),
        alias = null,
        type = "empty",
        payload = {},
        absolute = false,
        pos = {},
        width = null,
        height = null,
        style = null,
        listeners = []
    } = {}) {
        super({ type, payload, template: PayloadTemplates });
        this.id = id;
        this.alias = alias;
        this.pos = new Coord(pos);
        this.absolute = absolute;
        this.width = width;
        this.height = height;
        this.style = style;
        this.listeners = new Sortable(listeners, Listener);
    }
    get storeData() {
        return {
            ...this,
            ...super.storeData,
            alias: this.alias,
            width: this.width,
            height: this.height,
            style: this.style,
            pos: this.pos.storeData,
            absolute: this.absolute,
            listeners: this.listeners.storeData
        };
    }
}
