import Sortable from "@classes/sortable.svelte";
import ValueProcess from "./valueProcess.svelte";

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
    get value() {
        return this.process.list.reduce((result, process) => process.process(result), this.base);
    }
    get storeData() {
        return {
            baseType: this.baseType,
            baseValue: this.baseValue,
            process: this.process.storeData
        };
    }
}
