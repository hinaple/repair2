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
        if (!this.name || this.name === "null") {
            this.imported = null;
            return null;
        }

        this.imported = await importPlugin(this.#type, this.name);
        return this.imported;
    }

    async loadModules(packageLoader) {
        if (!this.imported || this.imported === null || !this.imported.dependencies || this.modules)
            return;

        this.modules = {};
        const loadedModules = await Promise.all(
            Object.entries(this.imported.dependencies).map(async ([name, version]) => {
                const module = await packageLoader.require(name, version);
                return [name, module];
            })
        );
        loadedModules.forEach(([name, module]) => {
            this.modules[name] = module;
        });
        return;
    }

    async use(packageLoader) {
        if (!this.name || this.name === "null") return null;
        if (this.imported === false) await this.promise;
        if (this.imported === null) return null;

        await this.loadModules(packageLoader);

        if (this.#type === "frames" || this.#type === "elements") {
            const temp = new this.imported({ modules: this.modules });
            this.attributes.forEach((attr) => {
                temp.setAttribute(attr, this.payloads[attr]);
            });
            return temp;
        }

        if (
            this.#type === "functions" ||
            (this.#type === "transitions" && this.imported?.function)
        ) {
            return (argument = null) =>
                this.imported.function({
                    attributes: this.payloads,
                    modules: this.modules,
                    ...argument
                });
        }
        if (this.#type === "transitions") return this.imported.keyframes ?? [];

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
