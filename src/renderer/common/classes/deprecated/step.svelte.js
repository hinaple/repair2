import TypePayload from "./typePayload.svelte";
import Component from "./component.svelte";
import { genId } from "@shared/genId";
import PluginPointer from "./pluginPointer.svelte";
import { StepPayloadTemplate } from "@shared/projectData/typePayload/step";

// class executePlugin {
//     waitTillEnd = $state();
//     constructor({ plugin = {}, waitTillEnd = false }) {
//         this.plugin = new PluginPointer(plugin, "function");
//         this.waitTillEnd = waitTillEnd;
//     }
//     //#only editor
//     get storeData() {
//         return { plugin: this.plugin.storeData, waitTillEnd: this.waitTillEnd };
//     }
//     //#endonly
// } //need migration

export default class Step extends TypePayload {
    title = $state();
    constructor(
        { id = genId(), type = null, title = null, payload = {} } = {},
        creatingOpt = null
    ) {
        if (
            (type?.join(".") ?? type) === "Communication.Socket.send" &&
            !Array.isArray(payload.data)
        ) {
            payload.data =
                typeof payload.data === "string"
                    ? payload.data.split(payload.splitStr ?? null)
                    : [payload.data];
        }
        super("step", { type, payload }, creatingOpt);
        this.id = id;
        this.title = title;
    }
    execute() {}

    //#only editor
    get displayTitle() {
        if (this.title?.length) return this.title;
        if (this.type === "delay") return `딜레이 ${this.payload.delayMs}ms`;
        if (
            this.type === "Others.runtimePluginStep" &&
            this.payload.pluginName &&
            this.payload.step
        )
            return `${this.payload.step}(${this.payload.pluginName})`;
        return null;
    }
    get storeData() {
        return {
            id: this.id,
            ...super.storeData,
            title: this.title
        };
    }
    copyData(availableOuputIds = null) {
        return {
            ...super.copyData(availableOuputIds),
            title: this.title
        };
    }
    //#endonly
}
