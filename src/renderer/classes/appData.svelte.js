import Config from "./config.svelte";
import Resource from "./resource.svelte";
import Variable from "./variable.svelte";
import Sequence from "./nodes/sequence.svelte";
import Branch from "./nodes/branch.svelte";
import Entry from "./nodes/entry.svelte";

export default class AppData {
    resources = $state([]);
    variables = $state([]);
    nodes = $state([]);
    constructor({ config = {}, resources = [], variables = [], nodes = [] } = {}) {
        this.config = new Config(config);
        this.resources = resources.map((r) => new Resource(r));
        this.variables = variables.map((r) => new Variable(r));
        this.nodes = nodes.map((node) => {
            if (node.type === "sequence") return new Sequence(node);
            else if (node.type === "branch") return new Branch(node);
            else if (node.type === "entry") return new Entry(node);
        });
    }
    findResourceByTitle(title) {
        return this.resources.find((r) => r.title === title);
    }
    findResourceById(id) {
        return this.resources.find((r) => r.id === id);
    }
    findVariableById(id) {
        return this.variables.find((v) => v.id === id);
    }
    findNodeById(id) {
        return this.nodes.find((node) => node.id === id);
    }
    findAllEntry(entryType, data = null) {
        return this.nodes.filter((node) => {
            if (node.type !== "entry" || entryType !== node.data.shortType) return false;
            if (!node.data.payload) return true;

            if (entryType === "Communication.serialData" && !node.data.payload.whenDataIs?.length)
                return true;

            return Object.entries(node.data.payload).every(
                ([key, value]) => value.trim() === data[key].trim()
            );
        });
    }
    executeEntry(entryType, data = null) {
        const entries = this.findAllEntry(entryType, data);
        entries.forEach((entry) => {
            entry.output.goto();
        });
    }
    findSequence(id) {
        return this.nodes.find((node) => node.type === "sequence" && node.id === id);
    }
    findBranch(id) {
        return this.nodes.find((node) => node.type === "branch" && node.id === id);
    }
    addNodeWithHistory(addHistory, node) {
        addHistory({
            doFn: (d) => {
                this.nodes.push(d);
            },
            undoFn: () => {
                this.nodes.pop();
            },
            doData: node
        });
    }
}
