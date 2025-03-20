export default class Config {
    title = $state();
    width = $state();
    height = $state();
    sizeRatio = $state();
    filter = $state();
    style = $state();
    constructor({
        title = "REPAIR v2",
        width = null,
        height = null,
        sizeRatio = 1,
        filter = "",
        style = ""
    } = {}) {
        this.title = title;
        this.width = width;
        this.height = height;
        this.sizeRatio = sizeRatio;
        this.filter = filter;
        this.style = style;
    }
    get storeData() {
        return {
            ...this,
            title: this.title,
            width: this.width,
            height: this.height,
            sizeRatio: this.sizeRatio,
            filter: this.filter,
            style: this.style
        };
    }
}
