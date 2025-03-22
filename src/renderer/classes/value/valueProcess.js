import TypePayload from "../typePayload.svelte";

const PayloadTemplate = {
    trim: null,
    replaceAll: { from: "", to: "" },
    removeAll: { removing: "" },
    replaceAllRegex: { regex: "", to: "" },
    toLowerCase: null,
    toUpperCase: null,
    length: null,
    jsFunction: { scriptData: null }
};

export default class ValueProcess extends TypePayload {
    constructor({ type = null, payload = {} } = {}) {
        super({ type, payload, template: PayloadTemplate });
        this.id = Symbol();
    }
    process(before) {
        const string = before.toString();
        if (this.types[0] === "replaceAll")
            return string.replaceAll(this.payload.from, this.payload.to);
        if (this.types[0] === "removeAll") return string.replaceAll(this.payload.removing, "");
        if (this.types[0] === "replaceAllRegex")
            return string.replace(new RegExp(this.payload.regex, "g"), this.payload.to);
        if (this.types[0] === "toLowerCase") return string.toLowerCase();
        if (this.types[0] === "toUpperCase") return string.toUpperCase();
        if (this.types[0] === "trim") return string.trim();
        if (this.types[0] === "length") return string.length;
        if (this.types[0] === "jsFunction") {
            try {
                return new Function("value", this.payload.scriptData)(before);
            } catch {
                return string;
            }
        }
        return string;
    }
    get copyData() {
        const sd = this.storeData;
        delete sd.id;
        return sd;
    }
}
