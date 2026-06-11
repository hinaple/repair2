export default class PluginPointer {
    type = null;
    name = $state();
    exportName = $state();
    payloads = $state({});

    constructor({ name = null, exportName = "default", payloads = {} } = {}, type = "frame") {
        this.type = type;
        this.name = name === "null" ? null : name;
        this.exportName = exportName;
        this.payloads = payloads;
    }

    setName(name) {
        this.name = name;
    }

    //#only editor
    get storeData() {
        return {
            name: this.name || null,
            exportName: this.exportName || null,
            payloads: $state.snapshot(this.payloads)
        };
    }
    //#endonly
}
