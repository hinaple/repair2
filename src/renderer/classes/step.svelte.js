import TypePayload from "./typePayload.svelte";
import Component from "./component.svelte";
import { genId } from "./utils";

const PayloadTemplates = {
    CreateComponent: { isClass: true, class: Component },
    RemoveComponent: { componentAlias: null, ignoreUnbreakable: false },
    ModifyComponent: { componentAlias: null, modifyKey: null, modifyValue: null },
    ClearComponent: { ignoreUnbreakable: false },
    PlayAudio: { resourceId: null, channel: "default" },
    PauseAudio: { channel: "default" }
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
    get storeData() {
        return {
            ...this,
            ...super.storeData,
            title: this.title
        };
    }
}
