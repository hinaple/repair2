import TypePayload from "./typePayload.svelte";
import Component from "./component.svelte";
import { genId } from "./genId";
import PluginPointer from "./pluginPointer.svelte";

class executePlugin {
    waitTillEnd = $state();
    constructor({ plugin = {}, waitTillEnd = false }) {
        this.plugin = new PluginPointer(plugin, "function");
        this.waitTillEnd = waitTillEnd;
    }
    //#only editor
    get storeData() {
        return { plugin: this.plugin.storeData, waitTillEnd: this.waitTillEnd };
    }
    //#endonly
}

const PayloadTemplates = {
    Component: {
        isTypeObj: true,
        create: { isClass: true, class: Component },
        remove: { componentAlias: null, ignoreUnbreakable: true },
        clear: { ignoreUnbreakable: false },
        modify: { componentAlias: null, modifyKey: null, modifyValue: null }
    },
    Preload: {
        isTypeObj: true,
        add: { resourceArr: [] },
        release: { resourceArr: [] },
        releaseAll: null
    },
    Audio: {
        isTypeObj: true,
        play: { resourceId: null, channel: "default", volume: 100, loop: false },
        pause: { channel: "default" },
        resume: { channel: "default" },
        changeVolume: { channel: "default", volume: 100, duration: 0 },
        reset: {}
    },
    Communication: {
        isTypeObj: true,
        Serial: {
            isTypeObj: true,
            open: { portAlias: null, port: null, baudRate: 9600 },
            send: { data: null },
            close: null
        },
        Socket: {
            isTypeObj: true,
            connect: { url: null },
            connectService: { type: null, name: null },
            send: { channel: null, data: [null] },
            disconnect: null
        }
    },
    delay: { delayMs: 0 },
    Others: {
        isTypeObj: true,
        customReset: {
            audios: true,
            variables: true,
            components: true,
            steps: true,
            preloads: true,
            entries: true,
            runtimePlugins: true
        },
        setVariable: { variableId: null, value: null },
        resetAllVariables: null,
        executePlugin: { isClass: true, class: executePlugin },
        runtimePluginStep: { pluginName: null, step: null, payloads: {}, waitTillEnd: false },
        eventEmit: { channel: null, data: null },
        script: { code: null },
        log: { content: null }
    }
};

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
        super({ type, payload, template: PayloadTemplates }, creatingOpt);
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
