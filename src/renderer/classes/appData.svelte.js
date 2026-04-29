import Config from "./config.svelte";
import Resource from "./resource.svelte";
import Variable from "./variable.svelte";
import { NodeClasses } from "./utils";

export default class AppData {
    resources = $state([]);
    variables = $state([]);
    nodes = new Map();
    constructor({ config = {}, resources = [], variables = [], nodes = [] } = {}) {
        this.config = new Config(config);
        this.resources = resources.map((r) => new Resource(r));
        this.variables = variables.map((r) => new Variable(r));
        this.nodes = new Map(nodes.map((node) => [node.id, new NodeClasses[node.type](node)]));
    }
    findVariableById(id) {
        return this.variables.find((v) => v.id === id);
    }
    findNodeById(id) {
        return this.nodes.get(id);
    }

    //#only play
    findResourceByTitle(title) {
        return this.resources.find((r) => r.title === title);
    }
    findResourceById(id) {
        return this.resources.find((r) => r.id === id);
    }
    findAllEntry(entryType, data = null) {
        return this.nodes.values().filter((node) => {
            if (node.type !== "entry" || entryType !== node.data.shortType) return false;
            if (!node.data.payload || !data) return true;

            if (entryType === "Communication.serialData" && !node.data.payload.whenDataIs?.length)
                return true;

            if (
                entryType === "Communication.Socket.ondata" &&
                data?.channel &&
                node.data.payload.channel === data?.channel &&
                !node.data.payload.data?.length
            )
                return true;

            return Object.entries(node.data.payload).every(
                ([key, value]) => value.trim() === data[key].trim()
            );
        });
    }
    enterEntry(entryType, data = null) {
        const entries = this.findAllEntry(entryType, data);
        entries.forEach((entry) => {
            entry.enter();
        });
    }
    resetEntries() {
        this.nodes.forEach((e) => {
            if (e.type !== "entry") return;
            e.disable();
        });
    }
    findSequence(id) {
        return this.nodes.values().find((node) => node.type === "sequence" && node.id === id);
    }
    findBranch(id) {
        return this.nodes.values().find((node) => node.type === "branch" && node.id === id);
    }
    //#endonly
}
