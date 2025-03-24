import { importPlugin } from "./utils.js";

export default class PluginPointer {
    type = null;
    name = $state();
    payloads = $state({});
    imported = $state();

    constructor({ name = "null", payloads = {} } = {}, type = "frames") {
        this.type = type;
        this.name = name;
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
        return this.imported ? (this.imported.attributes ?? []) : [];
    }

    get storeData() {
        return { name: this.name, payloads: $state.snapshot(this.payloads) };
    }
}
