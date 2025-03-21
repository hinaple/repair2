import Output from "../output";
import Value from "../value/value.svelte";
import AdvancedNode from "./advancedNode";

export default class Branch extends AdvancedNode {
    operator = $state();
    scriptData = $state();
    disableAfterTrue = $state();
    disableAfterFalse = $state();
    constructor({
        valueA = {},
        valueB = {},
        operator = "equals",
        scriptData = null,
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
        this.scriptData = scriptData;
        this.disableAfterTrue = disableAfterTrue;
        this.disableAfterFalse = disableAfterFalse;
    }
    compare(a, b) {
        if (this.operator === "equals") return a == b;
        if (this.operator === "includes") return a.includes(b);
        if (this.operator === "gt") return +a > +b;
        if (this.operator === "lt") return +a < +b;
        if (this.operator === "gte") return +a >= +b;
        if (this.operator === "lte") return +a <= +b;
        if (this.operator === "jsFunction") {
            try {
                return new Function("valueA", "valueB", this.scriptData)(a, b);
            } catch (e) {
                return false;
            }
        }
        return false;
    }
    get isTrue() {
        return this.compare(this.valueA.value, this.valueB.value);
    }
    execute() {
        if (this.isTrue) this.trueOutput.goto();
        else this.falseOutput.goto();
    }
    get storeData() {
        return {
            ...super.storeData,
            valueA: this.valueA.storeData,
            valueB: this.valueB.storeData,
            operator: this.operator,
            disableAfterTrue: this.disableAfterTrue,
            disableAfterFalse: this.disableAfterFalse,
            scriptData: this.scriptData,
            trueOutput: this.trueOutput,
            falseOutput: this.falseOutput
        };
    }
}
