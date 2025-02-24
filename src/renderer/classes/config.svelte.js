export default class Config {
    title = $state();
    constructor({ title = "REPAIR v2" } = {}) {
        this.title = title;
    }
    get storeData() {
        return { ...this, title: this.title };
    }
}
