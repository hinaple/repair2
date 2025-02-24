import Component from "./component.svelte";
import * as StepPayloads from "./stepPayloads";
import { genId } from "./utils";

export default class Step {
    type = $state();
    title = $state();
    payload = $state();
    constructor({ id = genId(), type = null, title = null, payload = {} } = {}) {
        this.id = id;
        this.title = title;
        this.payload = payload;
        this.changeType(type, this.payload);
    }
    changeType(type, payload = {}) {
        this.type = type;
        if (type === "CreateComponent") this.payload = new Component(payload);
        else if (StepPayloads[type]) this.payload = new StepPayloads[type](payload);
    }
    changePayloadValue(key, value) {
        this.payload = { ...this.payload, [key]: value };
    }
    get storeData() {
        return {
            ...this,
            type: this.type,
            title: this.title,
            payload:
                this.type === "CreateComponent"
                    ? this.payload.storeData
                    : $state.snapshot(this.payload)
        };
    }
}
