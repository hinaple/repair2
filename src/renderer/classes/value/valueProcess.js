import TypePayload from "../typePayload.svelte";

const PayloadTemplate = {
    trim: null,
    replaceAll: { from: "", to: "" },
    removeAll: { removing: "" },
    replaceAllRegex: { regex: "", to: "" },
    toLowerCase: null,
    toUpperCase: null,
    length: null
};

export default class ValueProcess extends TypePayload {
    constructor({ type = null, payload = {} } = {}) {
        super({ type, payload, template: PayloadTemplate });
        this.id = Symbol();
    }
    process(before) {
        if (this.types[0] === "replaceAll")
            return before.toString().replaceAll(this.payload.from, this.payload.to);
        if (this.types[0] === "removeAll")
            return before.toString().replaceAll(this.payload.removing, "");
        if (this.types[0] === "replaceAllRegex")
            return before.toString().replace(new RegExp(this.payload.regex, "g"), this.payload.to);
        if (this.types[0] === "toLowerCase") return before.toString().toLowerCase();
        if (this.types[0] === "toUpperCase") return before.toString().toUpperCase();
        if (this.types[0] === "trim") return before.toString().trim();
        if (this.types[0] === "length") return before.toString().length;

        return before;
    }
}
