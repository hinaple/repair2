import Node from "./node.svelte";
import Output from "./output";
import Value from "./value/value.svelte";

export default class Branch extends Node {
    operator = $state();
    constructor({
        valueA = {},
        valueB = {},
        operator = "equals",
        trueOutput = {},
        falseOutput = {},
        ...nodeData
    }) {
        super("branch", nodeData);
        this.valueA = new Value(valueA);
        this.valueB = new Value(valueB);
        this.trueOutput = new Output(trueOutput);
        this.falseOutput = new Output(falseOutput);
        this.operator = operator;
    }
    compare(a, b) {
        if (this.operator === "equals") return a == b;
        if (this.operator === "includes") return a.includes(b);
        return false;
    }
    execute() {
        if (this.compare(this.valueA.value, this.valueB.value)) this.trueOutput.goto();
        else this.falseOutput.goto();
    }
    get storeData() {
        return {
            ...this,
            ...super.storeData,
            valueA: this.valueA.storeData,
            valueB: this.valueB.storeData,
            operator: this.operator
        };
    }
}
