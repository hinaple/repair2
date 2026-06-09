import { randomUUID, createHash } from "node:crypto";
import { isTypedArray } from "node:util/types";

import type {
    LogEntry,
    LogEntryInput,
    LogEntryInputWithContent,
    LogLevel,
    LogSubject
} from "@shared/log.types";

export type { LogEntry, LogLevel, LogSource, LogSubject } from "@shared/log.types";

const LEVELS = new Set(["debug", "info", "warning", "error"]);

export function normalizeLogLevel(level: LogEntryInput["level"]): LogLevel {
    return typeof level === "string" && LEVELS.has(level) ? (level as LogLevel) : "info";
}

export function stringifyLogValue(value: any, spaces: number = 2) {
    if (typeof value !== "number" && !value) return "";
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value, null, spaces);
    } catch {
        return String(value);
    }
}

export function normalizeLogSubject(subject: LogEntryInput["subject"]): LogSubject | null {
    if (!subject) return null;
    if (typeof subject === "string") return { id: subject };
    return subject;
}

export function inferLogPhase({ type, source }: { type?: string | null; source?: string | null }) {
    const value = `${type ?? ""} ${source ?? ""}`.toLowerCase();
    if (value.includes("manifest")) return "manifest";
    if (value.includes("build")) return "build";
    if (value.includes("link")) return "link";
    if (value.includes("runtime-main")) return "runtime-main";
    if (value.includes("runtime")) return "runtime";
    if (value.includes("import")) return "import";
    if (value.includes("export")) return "exports";
    if (value.includes("mount")) return "mount";
    return null;
}

function stableStringify(value: any): string {
    if (typeof value === "bigint") return `${value}n`;
    if (value === null || typeof value !== "object") return JSON.stringify(value);

    if (Array.isArray(value) || isTypedArray(value)) {
        return `[${[...value].map(stableStringify).join(",")}]`;
    }

    if (value instanceof Map) {
        return `Map{${[
            ...value.entries().map(([k, v]) => `${stableStringify(k)}=>${stableStringify(v)}`)
        ].join(",")}}`;
    }

    if (value instanceof Set) {
        return `Set{${[...value.values().map(stableStringify)].join(",")}`;
    }

    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
}

export function createLogFingerprint(input: LogEntryInputWithContent): string {
    const level = normalizeLogLevel(input.level);
    const source = input.source ?? "app";
    const subject = normalizeLogSubject(input.subject);
    const type = input.type ?? null;
    const phase = input.phase ?? inferLogPhase({ type, source });

    const normalized = {
        source,
        type,
        level,
        subject,
        phase,
        content: input.content,
        from: input.from
    };

    return createHash("sha1").update(stableStringify(normalized)).digest("hex");
}

export function createLogEntry(input: LogEntryInputWithContent): LogEntry {
    const now = input.updatedAt ?? Date.now();
    const level = normalizeLogLevel(input.level);
    const source = input.source ?? "app";
    const subject = normalizeLogSubject(input.subject);
    const type = input.type ?? null;
    const phase = input.phase ?? inferLogPhase({ type, source });
    const createdAt = input.createdAt ?? now;

    return {
        id: input.id ?? randomUUID(),
        type,
        source,
        level,
        subject,
        phase,
        content: input.content,
        from: input.from,
        createdAt,
        updatedAt: now,
        count: input.count ?? 1
    };
}
