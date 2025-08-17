export default class DragOption {
    use = $state(false);

    constructor({ use = false } = {}) {
        this.use = use;
    }
    get storeData() {
        return this.use ? {} : {};
    }
}
