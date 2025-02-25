export default class TypePayload {
    type = $state();
    payload = $state();
    #template = {};
    constructor({ type, payload, template }) {
        this.#template = template;
        this.changeType(type, payload);
    }
    genPayload(type, payload = {}) {
        if (!this.#template[type]) return payload;
        else if (this.#template[type].isClass) return new this.#template[type].class(payload);
        return { ...this.#template[type], ...payload };
    }
    changeType(type, payload = {}, raw = false) {
        this.type = type;
        this.payload = raw ? payload : this.genPayload(type, payload);
    }
    changeTypeWithHistory(addHistory, type) {
        const newPayload = this.genPayload(type);
        addHistory({
            doFn: ({ type, payload = {}, that }) => that.changeType(type, payload, true),
            doData: { type: type, payload: newPayload, that: this },
            undoData: { type: this.type, payload: this.payload, that: this }
        });
    }
    get storeData() {
        return {
            type: this.type,
            payload: this.payload.storeData ?? $state.snapshot(this.payload)
        };
    }
}
