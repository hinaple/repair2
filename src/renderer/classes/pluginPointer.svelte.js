import { importPlugin } from "./utils.js";

export default class PluginPointer {
    #type = null;
    name = $state();
    payloads = $state({});
    imported = $state();
    constructor({ name = "null", payloads = {} } = {}, type = "frames") {
        this.#type = type;
        this.name = name;
        this.payloads = payloads;
        this.imported = false;
        this.promise = this.import();
    }
    async import() {
        if (!this.name || this.name === "null") this.imported = null;
        else this.imported = await importPlugin(this.#type, this.name);
        return this.imported;
    }
    use() {
        if (!this.name || this.name === "null") return null;
        if (this.imported === false) return "importing";
        if (this.imported === null) return null;

        if (this.#type === "frames" || this.#type === "elements") {
            const temp = new this.imported();
            this.attributes.forEach((attr) => {
                temp.setAttribute(attr, this.payloads[attr]);
            });
            return temp;
        }
        if (this.#type === "functions") return () => this.imported({ attributes: this.payloads });

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
