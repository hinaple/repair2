import Output from "../output";
import Value from "../value/value.svelte";
import AdvancedNode from "./advancedNode";

export default class VariableSet extends AdvancedNode {
    variable = $state();
    constructor({ variable = null, value = {}, output = {}, ...nodeData }) {
        super("variableSet", nodeData);
        this.value = new Value(value);
        this.output = new Output(output);

        this.variable = variable;
    }
    get storeData() {
        return {
            ...super.storeData,
            variable: this.variable,
            value: this.value.storeData,
            output: this.output
        };
    }
    get copyData() {
        return {
            ...super.copyData,
            variable: this.variable,
            value: this.value.storeData
        };
    }
}
