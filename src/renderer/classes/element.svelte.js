import Coord from "./coord";
import Listener from "./listener.svelte";
import Sortable from "./sortable.svelte";
import TypePayload from "./typePayload.svelte";
import PluginPointer from "./pluginPointer.svelte";
import { genId } from "./utils";
import DragOption from "./dragOption.svelte";

const PayloadTemplates = {
    empty: { content: null, isHtml: false },
    image: { resourceId: null, removePreload: true },
    video: { resourceId: null, removePreload: true, loop: false, volume: 100 },
    input: {
        variableId: null,
        placeholder: null,
        autofocus: false,
        maxLength: null,
        allowedType: "any",
        allowedRegex: null,
        isTextarea: false
    },
    plugin: { isClass: true, class: PluginPointer, argument: "elements" }
};

export default class Element extends TypePayload {
    alias = $state();
    fullscreen = $state();
    width = $state();
    height = $state();
    style = $state();
    childStyle = $state();
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
        childStyle = null,
        className = null,
        fullscreen = false,
        listeners = [],
        dragOption = {}
    } = {}) {
        super({ type, payload, template: PayloadTemplates });
        this.id = id;
        this.alias = alias;
        this.pos = new Coord(pos);
        this.absolute = absolute;
        this.fullscreen = fullscreen;
        this.width = width;
        this.height = height;
        this.style = style;
        this.childStyle = childStyle;
        this.className = className;
        this.listeners = new Sortable(listeners, Listener);
        this.dragOption = new DragOption(dragOption);
    }
    getStyleString(absolute, pos) {
        if (this.fullscreen)
            return (
                "position: absolute;" +
                "width: var(--gamezone-width); height: var(--gamezone-height);" +
                "left: 0; top: 0;" +
                (this.style ?? "")
            );
        return (absolute ? `position: absolute;${pos.styleString}` : "") + (this.style ?? "");
    }
    get styleString() {
        return this.getStyleString(this.absolute, this.pos);
    }
    get storeData() {
        return {
            ...super.storeData,
            id: this.id,
            alias: this.alias,
            width: this.width,
            height: this.height,
            style: this.style,
            childStyle: this.childStyle,
            className: this.className,
            pos: this.pos.storeData,
            absolute: this.absolute,
            fullscreen: this.fullscreen,
            listeners: this.listeners.storeData,
            dragOption: this.dragOption.storeData
        };
    }
    get copyData() {
        return {
            ...super.storeData,
            alias: this.alias,
            width: this.width,
            height: this.height,
            style: this.style,
            childStyle: this.childStyle,
            className: this.className,
            pos: this.pos.storeData,
            absolute: this.absolute,
            fullscreen: this.fullscreen,
            listeners: this.listeners.copyData,
            dragOption: this.dragOption.storeData
        };
    }
}
