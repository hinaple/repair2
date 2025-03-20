import PluginPointer from "./pluginPointer.svelte";

export default class Transition {
    duration = $state();
    easing = $state();
    delay = $state();
    constructor({ duration = 400, easing = "linear", delay = 0, plugin = {} } = {}) {
        this.duration = duration;
        this.easing = easing;
        this.delay = delay;
        this.plugin = new PluginPointer(plugin, "transitions");
    }
    get storeData() {
        return {
            duration: this.duration,
            easing: this.easing,
            delay: this.delay,
            plugin: this.plugin.storeData
        };
    }
}
