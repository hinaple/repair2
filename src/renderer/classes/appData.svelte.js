import Config from "./config.svelte";
import Resource from "./resource.svelte";
import Variable from "./variable.svelte";
import Sequence from "./sequence.svelte";
import Branch from "./branch.svelte";
import Entry from "./entry.svelte";

export default class AppData {
    resources = $state([]);
    variables = $state([]);
    nodes = $state([]);
    config = $state({});
    constructor({ config = {}, resources = [], variables = [], nodes = [] } = {}) {
        this.config = new Config(config);
        this.resources = resources.map((r) => new Resource(r));
        this.variables = variables.map((r) => new Variable(r));
        this.nodes = nodes.map((s) => {
            if (s.type === "sequence") return new Sequence(s);
            else if (s.type === "branch") return new Branch(s);
            else if (s.type === "entry") return new Entry(s);
        });
    }
}
