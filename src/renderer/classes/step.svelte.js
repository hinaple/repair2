import TypePayload from "./typePayload.svelte";
import Component from "./component.svelte";
import { genId } from "./utils";
import PluginPointer from "./pluginPointer.svelte";

const PayloadTemplates = {
    Component: {
        isTypeObj: true,
        create: { isClass: true, class: Component },
        remove: { componentAlias: null, ignoreUnbreakable: true },
        clear: { ignoreUnbreakable: false },
        modify: { componentAlias: null, modifyKey: null, modifyValue: null }
    },
    Audio: {
        isTypeObj: true,
        play: { resourceId: null, channel: "default", volume: 100, loop: false },
        pause: { channel: "default" },
        resume: { channel: "default" },
        changeVolume: { channel: "default", volume: 100 }
    },
    Preload: {
        isTypeObj: true,
        add: { resourceArr: [] },
        release: { resourceArr: [] },
        releaseAll: null
    },
    delay: { delayMs: 0 },
    setVariable: { variableId: null, value: null },
    executePlugin: { isClass: true, class: PluginPointer, argument: "functions" }
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
    execute() {
        return new Promise((res) => {
            res();
        });
    }
    get storeData() {
        return {
            ...this,
            ...super.storeData,
            title: this.title
        };
    }
}
