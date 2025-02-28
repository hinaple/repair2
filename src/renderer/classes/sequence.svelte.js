import Step from "./step.svelte";
import Node from "./node.svelte";
import Output from "./output";
import Sortable from "./sortable.svelte";

export default class Sequence extends Node {
    constructor({ steps = [], output = {}, ...nodeData } = {}) {
        super("sequence", nodeData);
        this.steps = new Sortable(steps, Step);
        this.output = new Output(output);
    }
    async execute() {
        for (const step of this.steps.list) {
            await step.execute();
        }
    }
    get storeData() {
        return { ...this, ...super.storeData, steps: this.steps.storeData };
    }
}
