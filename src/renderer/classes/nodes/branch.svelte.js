import Output from "../output";
import Value from "../value/value.svelte";
import AdvancedNode from "./advancedNode";

export default class Branch extends AdvancedNode {
    operator = $state();
    disableAfterTrue = $state();
    disableAfterFalse = $state();
    constructor({
        valueA = {},
        valueB = {},
        operator = "equals",
        trueOutput = {},
        falseOutput = {},
        disableAfterTrue = false,
        disableAfterFalse = false,
        ...nodeData
    }) {
        super("branch", nodeData);
        this.valueA = new Value(valueA);
        this.valueB = new Value(valueB);
        this.trueOutput = new Output(trueOutput);
        this.falseOutput = new Output(falseOutput);

        this.operator = operator;
        this.disableAfterTrue = disableAfterTrue;
        this.disableAfterFalse = disableAfterFalse;
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
            operator: this.operator,
            disableAfterTrue: this.disableAfterTrue,
            disableAfterFalse: this.disableAfterFalse
        };
    }
}
