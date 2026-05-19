import { importPlugin } from "./utils.js";

export default class PluginPointer {
    type = null;
    name = $state();
    payloads = $state({});
    imported = $state();

    constructor({ name = null, payloads = {} } = {}, type = "frames") {
        this.type = type;
        this.name = name === "null" ? null : name;
        this.payloads = payloads;
        this.imported = false;
        this.import();
    }

    async import() {
        if (!this.name || this.name === "null") {
            this.imported = null;
            return null;
        }

        this.imported = await importPlugin(this.type, this.name);
        return this.imported;
    }

    setName(name) {
        this.name = name;
        this.import();
    }

    get attributes() {
        return this.imported?.attributes ?? [];
    }
    get steps() {
        const rawSteps = this.imported?.steps;
        if (!rawSteps) return;
        return Array.isArray(rawSteps) ? rawSteps : Object.keys(rawSteps);
    }
    getStepAttributes(stepName) {
        const rawSteps = this.imported?.steps;
        if (!rawSteps) return;
        return Array.isArray(rawSteps) ? [] : (rawSteps[stepName] ?? []);
    }

    //#only editor
    get storeData() {
        return { name: this.name, payloads: $state.snapshot(this.payloads) };
    }
    //#endonly
}
