import type { TypePayloadUnion } from "./union.types";

export const ListenerPayloadTemplate = {
    custom: { channel: null },
    Mouse: {
        isTypeObj: true,
        click: null, //{ doubleClick: false },
        down: null,
        up: null
    },
    // click: null,
    input: null,
    keyPress: { key: null },
    videoEnd: null,
    jsFunction: { channel: null, scriptData: null },
    Drag: {
        isTypeObj: true,
        released: { hotspotIndexes: null },
        return: null
    },
    plugin: { plugin: null, channel: null }
} as const;

export type ListenerTypePayload = TypePayloadUnion<typeof ListenerPayloadTemplate>;
