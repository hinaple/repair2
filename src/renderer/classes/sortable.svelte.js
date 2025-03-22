export default class Sortable {
    list = $state();
    constructor(payloads, elementClass) {
        this.elementClass = elementClass;
        this.list = payloads.map((p) => new elementClass(p));
    }
    add(v) {
        this.list = [...this.list, v];
    }
    insert(v, idx) {
        this.list = this.list.toSpliced(idx, 0, v);
    }
    remove(idx) {
        if (idx === -1) return;
        this.list = this.list.toSpliced(idx, 1);
    }
    getIdxById(id) {
        return this.list.findIndex((s) => s.id === id);
    }
    reorder(fromIdx, toIdx) {
        this.list = this.list.toSpliced(toIdx, 0, this.list.splice(fromIdx, 1)[0]);
    }
    addWithHistory(addHistory, { afterChange = null, addingEl = new this.elementClass() } = {}) {
        addHistory({
            doFn: ({ addingEl, that }) => {
                that.add(addingEl);
                if (afterChange) afterChange();
            },
            undoFn: ({ idx, that }) => {
                that.remove(idx);
                if (afterChange) afterChange();
            },
            doData: { addingEl, that: this },
            undoData: { idx: this.list.length, that: this }
        });
        return addingEl;
    }
    removeWithHistory(el, addHistory, afterChange) {
        const tempIdx = this.getIdxById(el.id);
        addHistory({
            doFn: ({ idx, that }) => {
                that.remove(idx);
                if (afterChange) afterChange();
            },
            undoFn: ({ el, idx, that }) => {
                that.insert(el, idx);
                if (afterChange) afterChange();
            },
            doData: { idx: tempIdx, that: this },
            undoData: { el, idx: tempIdx, that: this }
        });
    }
    reorderWithHistory(addHistory, { from, to }) {
        addHistory({
            doFn: ({ a, b, that }) => {
                that.reorder(a, b);
            },
            doData: { a: from, b: to, that: this },
            undoData: { a: to, b: from, that: this }
        });
    }

    get storeData() {
        return this.list.map((s) => s.storeData);
    }
    get copyData() {
        return this.list.map((s) => s.copyData);
    }
}
