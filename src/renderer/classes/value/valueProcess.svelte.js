import { genId } from "@classes/utils";

export default class ValueProcess {
    type = $state();
    payload = $state();
    constructor({ type = null, payload = {} } = {}) {
        this.type = type;
        this.payload = payload;
        this.id = Symbol();
    }
    changeType(type, payload = {}) {
        this.type = type;
        this.payload = payload;
    }
    process(before) {
        if (this.type === "replaceAll")
            return before.replaceAll(this.payload.from, this.payload.to);
        if (this.type === "removeAll") return before.replaceAll(this.payload.removing, "");
        if (this.type === "replaceAllRegex")
            return before.replace(new RegExp(this.payload.regex, "g"), this.payload.to);
        if (this.type === "toLowerCase") return before.toLowerCase();
        if (this.type === "toUpperCase") return before.toUpperCase();
        if (this.type === "trim") return before.trim();

        return before;
    }
    get storeData() {
        return { type: this.type, payload: $state.snapshot(this.payload) };
    }
}
