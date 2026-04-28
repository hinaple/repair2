import TypePayload from "../typePayload.svelte";

const PayloadTemplate = {
    trim: null,
    replaceAll: { from: "", to: "" },
    removeAll: { removing: "" },
    replaceAllRegex: { regex: "", to: "" },
    toLowerCase: null,
    toUpperCase: null,
    length: null,
    koToEn: null,
    enToKo: null,
    jsFunction: { scriptData: null }
};

export default class ValueProcess extends TypePayload {
    constructor({ type = null, payload = {} } = {}) {
        super({ type, payload, template: PayloadTemplate });
        this.id = Symbol();
    }
    copyData(availableOuputIds = null) {
        const sd = this.storeData;
        delete sd.id;
        return sd;
    }
}
