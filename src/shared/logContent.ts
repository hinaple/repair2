const UnsupportedTypes = ["function", "object", "symbol", "bigint"];
const SupportedClasses = [
    "String",
    "Number",
    "Boolean",
    "ArrayBuffer",
    "DataView",
    "Date",
    "RegExp",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "Float16Array",
    "Float32Array",
    "Float64Array",
    "BigInt64Array",
    "BigUint64Array"
];

export type SingleLogContent =
    | null
    | undefined
    | number
    | string
    | boolean
    | ArrayBuffer
    | DataView
    | Date
    | RegExp
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float16Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array
    | Map<SingleLogContent, SingleLogContent>
    | Array<SingleLogContent>
    | Set<SingleLogContent>
    | { [k: string]: SingleLogContent }
    | { _type: "function" | "symbol" | "bigint"; value: string }
    | { _type: "Error"; value: { name: string; message: string; stack?: string; cause?: string } }
    | { _type: string; value: string }
    | { _circularRef: true };

export type LogContent = SingleLogContent[];

function normalizeSingleLogContent(
    value: {} | null | undefined,
    _refs = new WeakSet()
): SingleLogContent {
    const type = typeof value;
    if (value === null || value === undefined || !UnsupportedTypes.includes(type)) return value;
    const className = value?.constructor?.name;
    if (!className) return null;
    if (className && SupportedClasses.includes(className)) return value;
    if (type === "function" || type === "symbol" || type === "bigint")
        return { _type: type, value: String(value as Function | Symbol | bigint) };
    if (value instanceof Error)
        return {
            _type: "Error",
            value: {
                name: value.name,
                message: value.message,
                stack: value.stack,
                cause: value.cause?.toString()
            }
        };

    if (_refs.has(value)) return { _circularRef: true };
    _refs.add(value);
    if (className === "Array")
        return (value as Array<any>).map((v) => normalizeSingleLogContent(v, _refs));
    if (className === "Object")
        return Object.fromEntries(
            Object.entries(value as Record<string, any>).map(([k, v]) => [
                String(k),
                normalizeSingleLogContent(v, _refs)
            ])
        );
    if (className === "Map")
        return new Map(
            (value as Map<any, any>)
                .entries()
                .map(([k, v]) => [
                    normalizeSingleLogContent(k, _refs),
                    normalizeSingleLogContent(v, _refs)
                ])
        );
    if (className === "Set")
        return new Set(
            (value as Set<any>).values().map((v) => normalizeSingleLogContent(v, _refs))
        );

    return { _type: className, value: String(value) };
}
export function logContent(detail?: null | {}[] | {}): LogContent {
    if (detail === null || detail === undefined) return [];
    const result = (Array.isArray(detail) ? detail : [detail]).map((d) =>
        normalizeSingleLogContent(d)
    );
    return result;
}

export const ObjectContents = ["Array", "Object", "Map", "Set"] as const;
export type ObjectContentType = (typeof ObjectContents)[number];
