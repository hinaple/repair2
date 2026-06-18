import type { TypePayloadUnion } from "./union.types";

export const EntryPayloadTemplate = {
    startup: null,
    Communication: {
        isTypeObj: true,
        Socket: {
            isTypeObj: true,
            ondata: { channel: null, data: null },
            connect: null
        },
        serialData: { whenDataIs: null }
    },
    shortcut: {
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
        metaKey: false,
        pressingTime: 0,
        key: null
    },
    event: { channel: null }
} as const;

export type EntryTypePayload = TypePayloadUnion<typeof EntryPayloadTemplate, "entryType">;
