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
    input: null,
    keyPress: { key: null },
    click: null,
    videoEnd: null,
    jsFunction: { channel: null, scriptData: null },
    plugin: { isClass: true, class: PluginListener }
};

const TypeMap = {
    keyPress: "keydown",
    videoEnd: "ended"
};

export default class Listener extends TypePayload {
    once = $state();
    constructor({ type = "custom", payload = {}, output = {}, once = false } = {}) {
        super({ type, payload, template: PayloadTemplates });
        this.output = new Output(output);
        this.once = once;
        this.id = Symbol();
    }
    get title() {
        if (this.types[0] === "custom" && this.payload.channel?.length) return this.payload.channel;
        return null;
    }
    get realEventChannel() {
        return this.payload.channel?.length
            ? this.payload.channel
            : (TypeMap[this.types[0]] ?? this.types[0]);
    }
    get storeData() {
        return { ...super.storeData, output: this.output, once: this.once };
    }
    get copyData() {
        return { ...super.storeData, once: this.once };
    }
}
