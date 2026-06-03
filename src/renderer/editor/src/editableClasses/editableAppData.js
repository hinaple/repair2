import AppData from "@classes/appData.svelte";
import { addHistory } from "../lib/workHistory";
import { getAllConnectedLines, setAllOutput } from "../nodes/lines/line";
import { SvelteMap } from "svelte/reactivity";

export default class EditableAppData extends AppData {
    constructor(...props) {
        super(...props);
        this.nodes = new SvelteMap(this.nodes);
    }
    addNode(node) {
        addHistory({
            doFn: (d) => {
                this.nodes.set(d.id, d);
            },
            undoFn: (id) => {
                this.nodes.delete(id);
            },
            doData: node,
            undoData: node.id
        });
    }
    addManyNodes(nodes) {
        addHistory({
            doFn: (nodes) => {
                nodes.forEach((node) => {
                    this.nodes.set(node.id, node);
                });
            },
            undoFn: (nodes) => {
                nodes.forEach(({ id }) => this.nodes.delete(id));
            },
            doData: nodes,
            undoData: nodes
        });
    }
    removeNode(node) {
        const connectedLines = getAllConnectedLines(node.id);
        addHistory({
            doFn: ({ id, connectedLines }) => {
                this.nodes.delete(id);
                setAllOutput(connectedLines, null);
            },
            undoFn: ({ node, connectedLines }) => {
                this.nodes.set(node.id, node);
                setAllOutput(connectedLines, node.id);
            },
            doData: { id: node.id, connectedLines },
            undoData: { node, connectedLines }
        });
    }
    removeManyNodes(nodes) {
        const connectedLines = nodes.map((node) => getAllConnectedLines(node.id));
        addHistory({
            doFn: ({ nodes, connectedLines }) => {
                nodes.forEach(({ id }, i) => {
                    this.nodes.delete(id);
                    setAllOutput(connectedLines[i], null);
                });
            },
            undoFn: ({ nodes, connectedLines }) => {
                nodes.forEach((node, i) => {
                    this.nodes.set(node.id, node);
                    setAllOutput(connectedLines[i], node.id);
                });
            },
            doData: { nodes, connectedLines },
            undoData: { nodes, connectedLines }
        });
    }
    get nodeConnects() {
        const connects = new Map(
            this.nodes.values().map((n) => [
                n.id,
                {
                    ins: new Set(),
                    outs: new Set((n.outputs ?? [n.output])?.map((o) => o.to).filter(Boolean) ?? [])
                }
            ])
        );
        connects.forEach((c, id) => {
            c.outs.forEach((o) => connects.get(o).ins.add(id));
        });
        return connects;
    }
}
