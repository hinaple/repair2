import type { LogEntry } from "@shared/log.types";
import type { SingleLogContent } from "@shared/logContent";

function newEl(
    tag: string | (string | null | false | undefined)[],
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
        ".log-wrapper",
        newEl(
            ["div", "log", log.level],
            log.content.map((c) => {
                const createResult = createLogContent(c);
                if (createResult.collapsable)
                    return collapsable(createResult.el, (indentLv: number) =>
                        collapsableFullList(createResult.type, c as CollapsableContent, indentLv)
                    );
                return createResult.el;
            })
        )
    );

    return container;
}

function createLogContent(
    content: SingleLogContent,
    inlineLv: number = 0
): { el: HTMLElement; type: string; collapsable?: boolean } {
    const [type, cc] = getContentType(content);

    const tag = ["span", "log-content", type.toLowerCase(), inlineLv > 0 && "inline"];
    if (SpanContentTypes.includes(type)) {
        return { el: newEl(tag, spanContent(type, cc as SpanContent, inlineLv)), type };
    }
    if (inlineLv > 1) {
        return { el: newEl(tag, collapsableInlineText(type, cc as CollapsableContent)), type };
    }
    const cpv = collapsablePreview(type, cc as CollapsableContent);
    if (!cpv) {
        return { el: newEl([...tag, "unknown"], `${type}?<${cc}>`), type };
    }
    return {
        collapsable: true,
        type,
        el: cpv
    };
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
    inlineLv: number
) {
    if (type === "string") return inlineLv ? `'${content}'` : (content as string);
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
        if (inlineLv) return "ƒ";

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
    getList: (indentLv: number) => HTMLElement[],
    indentLv: number = 1
) {
    const btn = newEl("button.collapse-btn", "▶");
    const headEl = newEl(".head", [btn, head]);
    const el = newEl(`.collapsable`, headEl);
    let collapsed = true;
    let listEl: HTMLElement | null = null;
    headEl.addEventListener("click", () => {
        collapsed = !collapsed;
        if (collapsed) {
            btn.classList.remove("expanded");
            listEl?.remove();
        } else {
            btn.classList.add("expanded");
            listEl?.remove();
            listEl = newEl(".expanded-list", getList(indentLv + 1));
            listEl.style.setProperty("--indent-lv", String(indentLv + 1));
            el.append(listEl);
        }
    });
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
                    newEl("span.pair", [newEl("span.key", k), ": ", createLogContent(c, 2).el])
                )
            ),
            "}"
        );
    } else if (Array.isArray(content)) {
        preview.append(
            `(${content.length}) [`,
            ...joinComma(content.map((c) => createLogContent(c, 2).el)),
            "]"
        );
    } else if (content instanceof Map) {
        preview.append(
            `${type}(${content.size}) {`,
            ...joinComma(
                [...content.entries()].map(([k, c]) =>
                    newEl("span.pair", [
                        createLogContent(k, 2).el,
                        " => ",
                        createLogContent(c, 2).el
                    ])
                )
            ),
            "}"
        );
    } else if (content instanceof Set) {
        preview.append(
            `${type}(${content.size}) {`,
            ...joinComma([...content.values()].map((c) => createLogContent(c, 2).el)),
            "}"
        );
    } else if (content instanceof TypedArray) {
        preview.append(
            `${type}(${(content as Int16Array).length}) [`,
            ...joinComma([...(content as Int16Array)].map((c) => createLogContent(c, 2).el)),
            "]"
        );
    } else return false;

    return preview;
}
function collapsableFullList(
    type: string,
    content: CollapsableContent,
    indentLv: number
): HTMLElement[] {
    const newCollapsable = (
        head: string | HTMLElement,
        getList: (indentLv: number) => HTMLElement[]
    ) => collapsable(head, getList, indentLv);

    let lineArr: {
        key: string | number;
        el: HTMLElement;
        type: string;
        collapsable?: boolean;
        content: SingleLogContent;
    }[];
    if (Array.isArray(content))
        lineArr = content.map((c, i) => ({ key: i, ...createLogContent(c, 1), content: c }));
    else if (content instanceof TypedArray)
        lineArr = [...(content as Uint16Array)].map((c, i) => ({
            key: i,
            ...createLogContent(c, 1),
            content: c
        }));
    else if (content instanceof Set)
        lineArr = [...content.values()].map((c, i) => ({
            key: i,
            ...createLogContent(c, 1),
            content: c
        }));
    else if (content instanceof Map)
        lineArr = [...content.entries()].map(([k, v], i) => ({
            key: i,
            el: newEl("span.pair", [createLogContent(k, 2).el, " => ", createLogContent(v, 2).el]),
            collapsable: true,
            type: "Object",
            content: { key: k, value: v }
        }));
    else if (type === "Object")
        lineArr = Object.entries(content).map(([k, v]) => ({
            key: k,
            ...createLogContent(v, 1),
            content: v
        }));
    else lineArr = [{ key: "Unknown", ...createLogContent(content, 2), content }];

    return lineArr.map((l) => {
        const lineEl = newEl(
            ["div", "expanded-line"],
            [newEl("span.key", String(l.key)), ": ", l.el]
        );
        return l.collapsable
            ? newCollapsable(lineEl, (ii: number) =>
                  collapsableFullList(l.type, l.content as CollapsableContent, ii)
              )
            : lineEl;
    });
}

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
    return `${type}(${(content as Uint16Array).length})`;
}
