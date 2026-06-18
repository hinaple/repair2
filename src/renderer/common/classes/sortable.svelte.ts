// import Element from "./element.svelte";
// import Listener from "./listener.svelte";
// import Step from "./step.svelte";
// import ValueProcess from "./value/valueProcess";

// type SortableTypes =
// | "element"
// | "listener"
// | "step"
// | "valueProcess"

// export default class Sortable {
//     list = $state<string[]>([]);
//     constructor(ids: string[], type: SortableTypes, creatingOpt?: any) {
//         this.list = [...ids];
//     }
//     //#only editor
//     add(v: string) {
//         this.list = [...this.list, v];
//     }
//     insert(v: string, idx: number) {
//         this.list = this.list.toSpliced(idx, 0, v);
//     }
//     remove(idx: number) {
//         if (idx === -1) return;
//         this.list = this.list.toSpliced(idx, 1);
//     }
//     getIdxById(id: string) {
//         return this.list.findIndex((s) => s === id);
//     }
//     reorder(fromIdx: number, toIdx: number) {
//         this.list = this.list.toSpliced(toIdx, 0, this.list.splice(fromIdx, 1)[0]);
//     }
//     addWithHistory(addHistory, { afterChange = null, addingEl = new this.elementClass() } = {}) {
//         addHistory({
//             doFn: ({ addingEl, that }) => {
//                 that.add(addingEl);
//                 if (afterChange) afterChange();
//             },
//             undoFn: ({ idx, that }) => {
//                 that.remove(idx);
//                 if (afterChange) afterChange();
//             },
//             doData: { addingEl, that: this },
//             undoData: { idx: this.list.length, that: this }
//         });
//         return addingEl;
//     }
//     removeWithHistory(el, addHistory, afterChange) {
//         const tempIdx = this.getIdxById(el.id);
//         addHistory({
//             doFn: ({ idx, that }) => {
//                 that.remove(idx);
//                 if (afterChange) afterChange();
//             },
//             undoFn: ({ el, idx, that }) => {
//                 that.insert(el, idx);
//                 if (afterChange) afterChange();
//             },
//             doData: { idx: tempIdx, that: this },
//             undoData: { el, idx: tempIdx, that: this }
//         });
//     }
//     reorderWithHistory(addHistory, { from, to }) {
//         addHistory({
//             doFn: ({ a, b, that }) => {
//                 that.reorder(a, b);
//             },
//             doData: { a: from, b: to, that: this },
//             undoData: { a: to, b: from, that: this }
//         });
//     }

//     get storeData() {
//         return [...this.list];
//     }
//     copyData(availableOuputIds = null) {
//         return this.list.map((s) => s.copyData(availableOuputIds));
//     }
//     get outputs() {
//         const arr = [];
//         this.list.forEach((s) => arr.push(...(s.outputs ?? [s.output])));
//         return arr.filter(Boolean);
//     }
//     //#endonly
// } //need migration
