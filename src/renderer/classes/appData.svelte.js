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
    findNodeById(id) {
        return this.nodes.find((node) => node.id === id);
    }
    findAllEntry(entryType, channel = null) {
        return this.nodes.filter(
            (node) =>
                node.type === "entry" && node.entryType === entryType && node.channel === channel
        );
    }
    findSequence(id) {
        return this.nodes.find((node) => node.type === "sequence" && node.id === id);
    }
    findBranch(id) {
        return this.nodes.find((node) => node.type === "branch" && node.id === id);
    }
}
