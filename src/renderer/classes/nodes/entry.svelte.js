import Node from "./node.svelte";
import Output from "../output";
import TypePayload from "@classes/typePayload.svelte";

const EntryTemplate = {
    startup: null,
    Communication: {
        isTypeObj: true,
        Socket: {
            isTypeObj: true,
            ondata: { channel: null },
            connect: null
        },
        serialData: { whenDataIs: null }
    },
    event: { channel: null }
};

export default class Entry extends Node {
    constructor({ output = {}, entryType = "startup", payload = null, ...nodeData } = {}) {
        super("entry", nodeData);
        this.output = new Output(output);
        this.data = new TypePayload({ type: entryType, payload, template: EntryTemplate });
    }

    async execute() {
        this.output.goto();
    }

    get storeData() {
        const { type: entryType, payload } = this.data.storeData;
        return { ...super.storeData, entryType, payload, output: this.output };
    }
    get copyData() {
        const { type: entryType, payload } = this.data.copyData;
        return { ...super.copyData, entryType, payload };
    }
}
