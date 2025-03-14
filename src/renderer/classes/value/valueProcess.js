import TypePayload from "../typePayload.svelte";

const PayloadTemplate = {
    trim: null,
    toLowerCase: null,
    toUpperCase: null,
    replaceAll: { from: "", to: "" },
    removeAll: { removing: "" },
    replaceAllRegex: { regex: "", to: "" }
};

export default class ValueProcess extends TypePayload {
    constructor({ type = null, payload = {} } = {}) {
        super({ type, payload, template: PayloadTemplate });
        this.id = Symbol();
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
}
