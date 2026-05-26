import Sortable from "@classes/sortable.svelte";
import ValueProcess from "./valueProcess";

export default class Value {
    baseType = $state();
    baseValue = $state();
    constructor({ baseType = "string", baseValue = null, process = [] } = {}) {
        this.changeBaseType(baseType, baseValue);
        this.process = new Sortable(process, ValueProcess);
    }
    changeBaseType(type, value = null) {
        this.baseType = type;
        this.baseValue = value;
    }
    //#only play
    get value() {
        return this.process.list.reduce(
            (result, process) => process.process(result),
            this.getBase()
        );
    }
    getBase() {
        return this.baseValue;
    }
    //#endonly

    //#only editor
    get storeData() {
        return {
            baseType: this.baseType,
            baseValue: this.baseValue,
            process: this.process.storeData
        };
    }
    copyData(availableOuputIds = null) {
        return {
            baseType: this.baseType,
            baseValue: this.baseValue,
            process: this.process.copyData()
        };
    }
    //#endonly
}
