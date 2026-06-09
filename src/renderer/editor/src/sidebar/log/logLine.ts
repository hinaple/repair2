import type { LogEntry } from "@shared/log.types";
import type { SingleLogContent } from "@shared/logContent";

function newEl(
    tag: string | (string | null | false)[],
    child?: string | HTMLElement | (HTMLElement | string)[]
) {
    const arr = Array.isArray(tag) ? (tag.filter(Boolean) as string[]) : tag.split(".");
    const el = document.createElement(arr[0] || "div");
    el.classList.add(...arr.toSpliced(0, 1));
    if (!child) return el;

    if (typeof child === "string") el.textContent = child;
    else el.append(...(Array.isArray(child) ? child : [child]));

    return el;
}

export function createLogElement(log: LogEntry) {
    const container = newEl(
        ".log",
        log.content.map((c) => createLogContent(c))
    );

    return container;
}

function createLogContent(content: SingleLogContent, inline = false, collapse = collapsable) {
    const [type, cc] = getContentType(content);

    const tag = ["span", "log-content", type.toLowerCase(), inline && "inline"];
    if (SpanContentTypes.includes(type)) {
        return newEl(tag, spanContent(type, cc as SpanContent, inline));
    }
    if (inline) {
        return newEl(tag, collapsableInlineText(type, cc as CollapsableContent));
    }
    const cpv = collapsablePreview(type, cc as CollapsableContent);
    if (!cpv) {
        return newEl([...tag, "unknown"], `${type}?<${cc}>`);
    }
    return cpv;
    // return collapse(cpv, () => collapsableFullList(type, cc as CollapsableContent));
}

type PureContent =
    | Extract<SingleLogContent, { _type: string }>["value"]
    | Exclude<SingleLogContent, { _type: string }>;
function getContentType(content: SingleLogContent): [string, PureContent] {
    if (content === null) return ["null", content];
    if (content === undefined) return ["undefined", content];
    const t = typeof content;
    if (t !== "object") return [t, content];
    if ("_circularRef" in (content as object)) return ["_circularRef", undefined];
    if ("_type" in (content as object))
        return [
            (content as any)._type as "Error" | "function" | "symbol" | "bigint" | string,
            (content as Extract<SingleLogContent, { _type: string }>).value
        ];
    const instance = content?.constructor?.name;
    return [instance || t, content];
}

const SpanContentTypes = [
    "function",
    "string",
    "null",
    "undefined",
    "number",
    "symbol",
    "bigint",
    "boolean",
    "DataView",
    "ArrayBuffer",
    "Error",
    "_circularRef",
    "Date"
];
type SpanContent = Extract<
    PureContent,
    { _type: "Error" | "bigint" | "symbol" | "function" } | undefined | object | string
>;
function spanContent(
    type: (typeof SpanContentTypes)[number],
    content: SpanContent,
    inline: boolean
) {
    if (type === "string") return inline ? `'${content}'` : (content as string);
    if (type === "null" || type === "undefined" || type === "number" || type === "boolean")
        return String(content);
    if (typeof content === "bigint") return String(content) + "n";

    if (type === "Error") {
        const err = content as Extract<SingleLogContent, { _type: "Error" }>["value"];
        return err.stack ?? err.message;
    }
    if (type === "_circularRef") return "<Circular*>";

    if (content instanceof DataView || content instanceof ArrayBuffer)
        return `${type}(${content.byteLength})`;
    const sv = String(content);
    if (type === "function") {
        if (inline) return "ƒ";

        const prefixLen = sv.startsWith("function")
            ? 0
            : sv.startsWith("async")
              ? "async ".length
              : -1;
        return [
            newEl("span.function-prefix", sv.substring(0, prefixLen) + "ƒ"),
            sv.substring(prefixLen + "function".length)
        ];
    }

    return sv + (type === "bigint" ? "n" : "");
}

function collapsable(
    head: string | HTMLElement,
    getList: () => (SingleLogContent | { k: string; v: SingleLogContent })[]
) {
    const el = newEl(`.collapsable`, newEl(".head", [newEl("button.collapse-btn", "▶"), head]));
    return el;
}

const TypedArray = Object.getPrototypeOf(Uint8Array);
type CollapsableContent = Extract<
    PureContent,
    any[] | { [k: string]: SingleLogContent } | Map<any, any> | Set<any> | ArrayBufferView
>;
function collapsablePreview(type: string, content: CollapsableContent) {
    const preview = newEl("span.preview");

    if (type === "Object") {
        preview.append(
            "{",
            ...joinComma(
                Object.entries(content as Record<string, SingleLogContent>).map(([k, c]) =>
                    newEl("span.pair", [newEl("span.key", k), ": ", createLogContent(c, true)])
                )
            ),
            "}"
        );
    } else if (Array.isArray(content)) {
        preview.append(
            `(${content.length}) [`,
            ...joinComma(content.map((c) => createLogContent(c, true))),
            "]"
        );
    } else if (content instanceof Map) {
        preview.append(
            `${type}(${content.size}) {`,
            ...joinComma(
                [...content.entries()].map(([k, c]) =>
                    newEl("span.pair", [
                        createLogContent(k, true),
                        " => ",
                        createLogContent(c, true)
                    ])
                )
            ),
            "}"
        );
    } else if (content instanceof Set) {
        preview.append(
            `${type}(${content.size}) {`,
            ...joinComma([...content.values()].map((c) => createLogContent(c, true))),
            "}"
        );
    } else if (content instanceof TypedArray) {
        preview.append(
            `${type}(${(content as Int16Array).length}) [`,
            ...joinComma([...(content as Int16Array)].map((c) => createLogContent(c, true))),
            "]"
        );
    } else return false;

    return preview;
}
// function collapsableFullList(type: string, content: CollapsableContent): HTMLElement[] {
//     let arr;
//     if (Array.isArray(content)) arr = content;
//     else if (content instanceof TypedArray) arr = [...(content as Uint16Array)];
//     else if (content instanceof Set) arr = [...content.values()];
//     newEl(".full-content");
// }

function joinComma(arr: any[]): any[] {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        result.push(arr[i]);
        if (i !== arr.length - 1) result.push(", ");
    }
    return result;
}

function collapsableInlineText(type: string, content: CollapsableContent) {
    if (type === "Object") return "{…}";
    if (Array.isArray(content)) return `Array(${content.length})`;
    if (type === "Map" || type === "Set")
        return `${type}(${(content as Map<any, any> | Set<any>).size})`;
    console.log(type);
    return `${type}(${(content as Uint16Array).length})`;
}
