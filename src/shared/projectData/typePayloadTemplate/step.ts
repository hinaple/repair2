import type { TypePayloadUnion } from "./union.types";

export const StepPayloadTemplate = {
    Component: {
        isTypeObj: true,
        create: { componentId: null },
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
        executePlugin: { plugin: null, waitTillEnd: false },
        runtimePluginStep: { pluginName: null, step: null, payloads: {}, waitTillEnd: false },
        eventEmit: { channel: null, data: null },
        script: { code: null },
        log: { content: null }
    }
} as const;

export type StepTypePayload = TypePayloadUnion<typeof StepPayloadTemplate>;
