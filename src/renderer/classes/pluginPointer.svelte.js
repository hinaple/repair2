export default class PluginPointer {
    type = null;
    name = $state();
    payloads = $state({});
    imported = $state();

    constructor({ name = null, payloads = {} } = {}, type = "frame") {
        this.type = type;
        this.name = name === "null" ? null : name;
        this.payloads = payloads;
        this.imported = false;

        //#only play
        this.ready?.();
        //#endonly
    }

    setName(name) {
        this.name = name;
    }

    //#only editor
    get storeData() {
        return { name: this.name, payloads: $state.snapshot(this.payloads) };
    }
    //#endonly
}
