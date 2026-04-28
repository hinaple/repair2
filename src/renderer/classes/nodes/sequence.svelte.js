import Step from "../step.svelte";
import Output from "../output";
import Sortable from "../sortable.svelte";
import AdvancedNode from "./advancedNode";

export default class Sequence extends AdvancedNode {
    constructor({ steps = [], output = {}, ...nodeData } = {}, creatingOpt = null) {
        super("sequence", nodeData);
        this.steps = new Sortable(steps, Step, creatingOpt);
        this.output = new Output(output, creatingOpt);
    }
    async execute() {
        for (const step of this.steps.list) {
            if ((await step.execute()) === false) return;
        }
        this.output.goto();
    }
    get storeData() {
        return { ...super.storeData, steps: this.steps.storeData, output: this.output };
    }
    copyData(availableOuputIds = null) {
        return {
            ...super.copyData(),
            steps: this.steps.copyData(availableOuputIds),
            output: this.output.copyData(availableOuputIds)
        };
    }
}
