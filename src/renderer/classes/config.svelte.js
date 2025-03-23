const styleMap = {
    width: ["width: ", "px"],
    height: ["height: ", "px"],
    filter: ["filter: ", ""],
    sizeRatio: ["transform: scale(", ")"],
    style: ["", ""]
};

export default class Config {
    title = $state();
    width = $state();
    height = $state();
    sizeRatio = $state();
    filter = $state();
    style = $state();
    editorShortcut = $state();
    editorPassword = $state();
    constructor({
        title = "REPAIR v2",
        width = null,
        height = null,
        sizeRatio = 1,
        filter = null,
        style = null,
        editorShortcut = "E",
        editorPassword = null
    } = {}) {
        this.title = title;
        this.width = width;
        this.height = height;
        this.sizeRatio = sizeRatio;
        this.filter = filter;
        this.style = style;
        this.editorShortcut = editorShortcut;
        this.editorPassword = editorPassword;
    }
    get styleString() {
        return (
            Object.entries(styleMap)
                .reduce((acc, [key, [prefix, suffix]]) => {
                    if (
                        this[key] !== null &&
                        (typeof this[key] === "number" || this[key].trim().length)
                    ) {
                        acc.push(`${prefix}${this[key]}${suffix}`);
                    }
                    return acc;
                }, [])
                .join("; ") + ";"
        );
    }
    get storeData() {
        return {
            ...this,
            title: this.title,
            width: this.width,
            height: this.height,
            sizeRatio: this.sizeRatio,
            filter: this.filter,
            style: this.style,
            editorShortcut: this.editorShortcut,
            editorPassword: this.editorPassword
        };
    }
}
