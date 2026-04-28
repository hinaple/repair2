import AppData from "@classes/appData.svelte";
import { addHistory } from "../lib/workHistory";

export default class EditableAppData extends AppData {
    addNode(node) {
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
    addManyNode(nodes) {
        addHistory({
            doFn: (nodes) => {
                this.nodes.push(...nodes);
            },
            undoFn: (from) => {
                this.nodes.splice(from);
            },
            doData: nodes,
            undoData: this.nodes.length
        });
    }
}
