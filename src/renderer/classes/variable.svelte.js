import { genId } from "./utils";

export default class Variable {
    name = $state();
    defaultValue = $state();
    constructor({ id = genId(), name = null, defaultValue = null } = {}) {
        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
    }
    get storeData() {
        return {
            ...this,
            name: this.name,
            defaultValue: this.defaultValue
        };
    }
}
