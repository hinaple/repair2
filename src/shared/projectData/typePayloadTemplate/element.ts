import type { TypePayloadUnion } from "./union.types";

export const ElementPayloadTemplate = {
    empty: { content: null, isHtml: false },
    image: { resourceId: null, removePreload: true },
    video: { resourceId: null, removePreload: true, loop: false, volume: 100 },
    input: {
        variableId: null,
        placeholder: null,
        autofocus: false,
        maxLength: null,
        allowedType: "any",
        allowedRegex: null,
        valueFunction: null,
        isTextarea: false
    },
    advancedInput: {
        variableId: null,
        maxLength: null,
        securityText: null
    },
    plugin: { plugin: null }
} as const;

export type ElementTypePayload = TypePayloadUnion<typeof ElementPayloadTemplate>;
