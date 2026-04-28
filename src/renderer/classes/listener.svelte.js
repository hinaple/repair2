import Output from "./output";
import PluginPointer from "./pluginPointer.svelte";
import TypePayload from "./typePayload.svelte";

class PluginListener {
    constructor({ channel = null, plugin = {} } = {}) {
        this.channel = channel;
        this.plugin = new PluginPointer(plugin, "functions");
    }
    get storeData() {
        return { channel: this.channel, plugin: this.plugin.storeData };
    }
}

const PayloadTemplates = {
    custom: { channel: null },
    Mouse: {
        isTypeObj: true,
        click: null, //{ doubleClick: false },
        down: null,
        up: null
    },
    // click: null,
    input: null,
    keyPress: { key: null },
    videoEnd: null,
    jsFunction: { channel: null, scriptData: null },
    Drag: {
        isTypeObj: true,
        released: { hotspotIndexes: null },
        return: null
    },
    plugin: { isClass: true, class: PluginListener }
};

const TypeMap = {
    keyPress: "keydown",
    globalKeyPress: "keydown",
    videoEnd: "ended",
    "Mouse.click": "click",
    "Mouse.down": "mousedown",
    "Mouse.up": "mouseup",
    "Drag.released": "dragreleased",
    "Drag.return": "dragreturn"
};

export default class Listener extends TypePayload {
    repeatCount = $state();
    repeatInterval = $state();
    once = $state();
    global = $state();
    useCapture = $state();
    constructor(
        {
            type = "custom",
            payload = {},
            output = {},
            once = false,
            repeatCount = 1,
            repeatInterval = 0,
            global = false,
            useCapture = false
        } = {},
        creatingOpt = null
    ) {
        if (type === "click" || type[0] === "click") type = ["Mouse", "click"];
        else if (type === "released" || type[0] === "released") type = ["Drag", "released"];
        else if (type === "globalKeyPress" || type[0] === "globalKeyPress") {
            type = ["keyPress"];
            global = true;
            useCapture = payload.useCapture ?? false;
        }
        super({ type, payload, template: PayloadTemplates });
        this.output = new Output(output, creatingOpt);
        this.repeatCount = repeatCount;
        this.repeatInterval = repeatInterval;
        this.once = once;
        this.id = Symbol();
        this.global = global;
        this.useCapture = useCapture;
    }
    get title() {
        if (this.shortType === "custom" && this.payload.channel?.length)
            return this.payload.channel;
        return null;
    }
    get realEventChannel() {
        return this.payload.channel?.length
            ? this.payload.channel
            : (TypeMap[this.shortType] ?? this.lastType);
    }
    get storeData() {
        return {
            ...super.storeData,
            output: this.output,
            repeatCount: this.repeatCount,
            repeatInterval: this.repeatInterval,
            once: this.once,
            global: this.global,
            useCapture: this.useCapture
        };
    }
    copyData(availableOuputIds = null) {
        return {
            ...super.storeData,
            repeatCount: this.repeatCount,
            repeatInterval: this.repeatInterval,
            once: this.once,
            global: this.global,
            useCapture: this.useCapture,
            output: this.output.copyData(availableOuputIds)
        };
    }
}
