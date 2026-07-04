import { nullDefault, type TypePayloadUnion } from "./union.types";

export const ElementPayloadTemplate = {
    empty: { content: nullDefault<string>(), isHtml: false },
    image: { resourceId: nullDefault<string>(), removePreload: true },
    video: { resourceId: nullDefault<string>(), removePreload: true, loop: false, volume: 100 },
    input: {
        variableId: nullDefault<string>(),
        placeholder: nullDefault<string>(),
        autofocus: false,
        maxLength: nullDefault<number>(),
        allowedType: "any",
        allowedRegex: nullDefault<string>(),
        valueFunction: nullDefault<string>(),
        isTextarea: false
    },
    advancedInput: {
        variableId: nullDefault<string>(),
        maxLength: nullDefault<number>(),
        securityText: nullDefault<string>()
    },
    plugin: { plugin: nullDefault<string>() }
} as const;

export type ElementTypePayload = TypePayloadUnion<typeof ElementPayloadTemplate>;
