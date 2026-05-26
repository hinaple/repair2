import PluginPointer from "./pluginPointer.svelte";
import ScreenConfig from "./screenConfig.svelte";

//#only play
const styleMap = {
    width: ["width: ", "px"],
    height: ["height: ", "px"],
    filter: ["filter: ", ""],
    sizeRatio: ["transform: scale(", ")"],
    style: ["", ""]
};
//#endonly

export default class Config {
    title = $state();
    width = $state();
    height = $state();
    sizeRatio = $state();
    filter = $state();
    style = $state();
    editorShortcut = $state();
    editorPassword = $state();
    transparent = $state();
    devMode = $state();
    alwaysOnTop = $state();
    suppressGlobalKeys = $state();
    runtimePlugins = $state();
    constructor({
        title = "REPAIR v2.4.9",
        width = null,
        height = null,
        sizeRatio = 1,
        filter = null,
        style = null,
        editorShortcut = "E",
        editorPassword = null,
        screenConfig = {},
        transparent = false,
        devMode = true,
        alwaysOnTop = false,
        suppressGlobalKeys = false,
        runtimePlugins = [],
        ...config
    } = {}) {
        this.title = title;
        this.width = width;
        this.height = height;
        this.sizeRatio = sizeRatio;
        this.filter = filter;
        this.style = style;
        this.editorShortcut = editorShortcut;
        this.editorPassword = editorPassword;
        if (!this.screenConfig && config.multiScreen !== undefined)
            this.screenConfig = { type: config.multiScreen ? "fullMultiScreen" : "fullscreen" };
        this.screenConfig = new ScreenConfig(screenConfig);
        this.transparent = transparent;
        this.devMode = devMode;
        this.alwaysOnTop = alwaysOnTop;
        this.suppressGlobalKeys = suppressGlobalKeys;
        this.runtimePlugins = runtimePlugins.map((rp) => new PluginPointer(rp, "runtimes"));
    }

    //#only play
    get styleString() {
        return (
            (this.transparent ? "background-color: transparent;" : "") +
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
                .join("; ") +
            ";"
        );
    }
    //#endonly

    //#only editor
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
            editorPassword: this.editorPassword,
            screenConfig: this.screenConfig.storeData,
            transparent: this.transparent,
            alwaysOnTop: this.alwaysOnTop,
            devMode: this.devMode,
            suppressGlobalKeys: this.suppressGlobalKeys,
            runtimePlugins: this.runtimePlugins.map((rp) => rp.storeData)
        };
    }
    //#endonly
}
