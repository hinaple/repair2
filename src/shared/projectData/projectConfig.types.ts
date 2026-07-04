import type { ScreenConfigTypePayload } from "./typePayloadTemplate/types";

export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue }
    | undefined;

export type JsonRecord = {
    [key: string]: JsonValue | undefined;
};

export type ScreenConfigStoreData = ScreenConfigTypePayload;

export type ViewportStoreData = {
    size?: number;
    pos?: {
        x: number;
        y: number;
    };
};
