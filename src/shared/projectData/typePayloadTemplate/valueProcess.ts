import type { TypePayloadUnion } from "./union.types";

export const ValueProcessPayloadTemplate = {
    trim: null,
    replaceAll: { from: "", to: "" },
    removeAll: { removing: "" },
    replaceAllRegex: { regex: "", to: "" },
    toLowerCase: null,
    toUpperCase: null,
    length: null,
    koToEn: null,
    enToKo: null,
    jsFunction: { scriptData: null }
} as const;

export type ValueProcessTypePayload = TypePayloadUnion<typeof ValueProcessPayloadTemplate>;
