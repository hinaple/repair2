import TypePayload from "./typePayload.svelte";
import Component from "./component.svelte";
import { genId } from "./utils";

const PayloadTemplates = {
    Component: {
        isTypeObj: true,
        create: { isClass: true, class: Component },
        remove: { componentAlias: null, ignoreUnbreakable: false },
        modify: { componentAlias: null, modifyKey: null, modifyValue: null },
        clear: { ignoreUnbreakable: false }
    },
    Audio: {
        isTypeObj: true,
        play: { resourceId: null, channel: "default" },
        pause: { channel: "default" }
    },
    delay: { delayMs: 0 }
};

export default class Step extends TypePayload {
    title = $state();
    constructor({ id = genId(), type = null, title = null, payload = {} } = {}) {
        super({ type, payload, template: PayloadTemplates });
        this.id = id;
        this.title = title;
    }
    changePayloadValue(key, value) {
        super.payload = { ...this.payload, [key]: value };
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
