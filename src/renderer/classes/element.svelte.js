import Coord from "./coord";
import Listener from "./listener.svelte";
import Sortable from "./sortable.svelte";
import TypePayload from "./typePayload.svelte";
import { genId } from "./utils";

const PayloadTemplates = {
    image: { resourceId: null, removePreload: true },
    video: { resourceId: null, removePreload: true, loop: false },
    input: {
        variableId: null,
        placeholder: null,
        autofocus: false,
        allowedType: null,
        allowedRegex: null
    },
    empty: { content: null, isHtml: false }
};

export default class Element extends TypePayload {
    alias = $state();
    width = $state();
    height = $state();
    style = $state();
    className = $state();
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
        className = null,
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
        this.className = className;
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
            className: this.className,
            pos: this.pos.storeData,
            absolute: this.absolute,
            listeners: this.listeners.storeData
        };
    }
}
