import TypePayload from "./typePayload.svelte";
import Component from "./component.svelte";
import { genId } from "./utils";
import PluginPointer from "./pluginPointer.svelte";

class executePlugin {
    waitTillEnd = $state();
    constructor({ plugin = {}, waitTillEnd = false }) {
        this.plugin = new PluginPointer(plugin, "functions");
        this.waitTillEnd = waitTillEnd;
    }
    get storeData() {
        return { plugin: this.plugin.storeData, waitTillEnd: this.waitTillEnd };
    }
}

const PayloadTemplates = {
    Component: {
        isTypeObj: true,
        create: { isClass: true, class: Component },
        remove: { componentAlias: null, ignoreUnbreakable: true },
        clear: { ignoreUnbreakable: false },
        modify: { componentAlias: null, modifyKey: null, modifyValue: null }
    },
    Preload: {
        isTypeObj: true,
        add: { resourceArr: [] },
        release: { resourceArr: [] },
        releaseAll: null
    },
    Audio: {
        isTypeObj: true,
        play: { resourceId: null, channel: "default", volume: 100, loop: false },
        pause: { channel: "default" },
        resume: { channel: "default" },
        changeVolume: { channel: "default", volume: 100, duration: 0 }
    },
    Communication: {
        isTypeObj: true,
        Serial: {
            isTypeObj: true,
            open: { portAlias: null, port: null, baudRate: 9600 },
            send: { data: null },
            close: null
        },
        Socket: {
            isTypeObj: true,
            connect: { url: null },
            send: { channel: null, data: null },
            disconnect: null
        }
    },
    delay: { delayMs: 0 },
    Others: {
        isTypeObj: true,
        setVariable: { variableId: null, value: null },
        resetAllVariables: null,
        executePlugin: { isClass: true, class: executePlugin },
        eventEmit: { channel: null, data: null }
    }
};

export default class Step extends TypePayload {
    title = $state();
    constructor({ id = genId(), type = null, title = null, payload = {} } = {}) {
        super({ type, payload, template: PayloadTemplates });
        this.id = id;
        this.title = title;
    }
    get displayTitle() {
        if (this.title?.length) return this.title;
        if (this.type === "delay") return `딜레이 ${this.payload.delayMs}ms`;
        return null;
    }
    execute() {}
    get storeData() {
        return {
            id: this.id,
            ...super.storeData,
            title: this.title
        };
    }
    get copyData() {
        return {
            ...super.copyData,
            title: this.title
        };
    }
}
