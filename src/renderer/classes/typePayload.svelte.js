export default class TypePayload {
    types = $state([]);
    type = $derived(this.types.join("."));
    payload = $state();
    #template = {};
    constructor({ type = [], payload, template }) {
        this.#template = template;
        this.changeType(type, payload);
    }
    getTemplateWithTypes(steps = this.types) {
        if (!steps.length) return this.#template;
        return steps.reduce(
            (currentObj, currentStep) => currentObj[currentStep] ?? {},
            this.#template
        );
    }
    get currentTemplate() {
        return this.getTemplateWithTypes();
    }
    get typeTree() {
        const tree = [Object.keys(this.#template)];
        this.types.reduce((currentObj, currentStep, i) => {
            const nextObj = currentObj[currentStep];
            if (nextObj?.isTypeObj) {
                const keys = Object.keys(nextObj);
                tree.push(keys.toSpliced(keys.indexOf("isTypeObj"), 1));
            }
            return nextObj;
        }, this.#template);
        return tree;
    }
    genPayload(payload = {}, currentTemplate = this.currentTemplate) {
        if (currentTemplate?.isTypeObj) return;

        if (!currentTemplate) return payload;
        else if (currentTemplate.isClass) return new currentTemplate.class(payload);
        return { ...currentTemplate, ...payload };
    }
    changeType(types = [], payload = {}, raw = false) {
        if (!Array.isArray(types)) this.types = [types];
        else this.types = [...types];

        if (raw) {
            this.payload = payload;
            return;
        }

        const currentTemplate = this.currentTemplate;
        if (currentTemplate?.isTypeObj) {
            this.payload = null;
            return;
        }

        this.payload = this.genPayload(payload, currentTemplate);
    }
    changeTypeWithHistory(addHistory, type, typeDepth = this.types.length) {
        const newTypes = [...this.types];
        newTypes.splice(typeDepth);
        newTypes.push(type);

        const tempTemplate = this.getTemplateWithTypes(newTypes);
        const newPayload = tempTemplate?.isTypeObj ? null : this.genPayload({}, tempTemplate);

        addHistory({
            doFn: ({ types, payload = {}, that }) => that.changeType(types, payload, true),
            doData: { types: newTypes, payload: newPayload, that: this },
            undoData: { types: this.types.map((t) => t), payload: this.payload, that: this }
        });
    }
    get storeData() {
        return {
            type: this.types.map((t) => t),
            payload: this.payload.storeData ?? $state.snapshot(this.payload)
        };
    }
}
