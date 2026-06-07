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

type DetailValue =
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
    | Map<DetailValue, DetailValue>
    | Array<DetailValue>
    | Set<DetailValue>
    | { [k: string]: DetailValue }
    | { _type: "function" | "symbol" | "bigint"; value: string }
    | { _type: "Error"; value: { name: string; message: string; stack?: string; cause?: string } }
    | { _type: string; value: string }
    | { _circularRef: true };

export type LogContent = DetailValue[];

function normalizeDetailValue(value: {} | null | undefined, _refs = new WeakSet()): DetailValue {
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
        return (value as Array<any>).map((v) => normalizeDetailValue(v, _refs));
    if (className === "Object")
        return Object.fromEntries(
            Object.entries(value as Record<string, any>).map(([k, v]) => [
                String(k),
                normalizeDetailValue(v, _refs)
            ])
        );
    if (className === "Map")
        return new Map(
            (value as Map<any, any>)
                .entries()
                .map(([k, v]) => [normalizeDetailValue(k, _refs), normalizeDetailValue(v, _refs)])
        );
    if (className === "Set")
        return new Set((value as Set<any>).values().map((v) => normalizeDetailValue(v, _refs)));

    return { _type: className, value: String(value) };
}
export function logContent(detail?: null | {}[] | {}): LogContent {
    if (detail === null || detail === undefined) return [];
    const result = (Array.isArray(detail) ? detail : [detail]).map((d) => normalizeDetailValue(d));
    return result;
}
