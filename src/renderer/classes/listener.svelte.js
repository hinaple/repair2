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
    keyPress: { key: null },
    click: null,
    videoEnd: null,
    jsFunction: { channel: null, scriptData: null },
    plugin: { isClass: true, class: PluginListener }
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
        if (this.type === "custom" && this.payload.channel?.length) return this.payload.channel;
        return null;
    }
    get storeData() {
        return { ...super.storeData, output: this.output, once: this.once };
    }
}
