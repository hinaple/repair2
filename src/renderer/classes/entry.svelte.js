import Node from "./node.svelte";
import Output from "./output";

export default class Entry extends Node {
    entryType = $state();
    channel = $state();
    constructor({ output = {}, entryType = "startup", channel = null, ...nodeData } = {}) {
        super("entry", nodeData);
        this.output = new Output(output);
        this.channel = channel;
        this.entryType = entryType;
    }

    async execute() {
        this.output.goto();
    }

    get storeData() {
        return { ...this, channel: this.channel, entryType: this.entryType, ...super.storeData };
    }
}