import { randomUUID, createHash } from "node:crypto";
import type { LogEntry, LogLevel, LogSource, LogSubject } from "@shared/log.types";

export type { LogEntry, LogLevel, LogSource, LogSubject } from "@shared/log.types";

type LogEntryBase = {
    type?: string | null;
    phase?: string | null;
    title: string;
};

export type LogEntryInput = LogEntryBase & {
    id?: string;
    source?: LogSource | null;
    level?: LogLevel | string | null;
    subject?: LogSubject | string | null;
    summary?: string | null;
    detail?: any;
    error?: any;
    createdAt?: number;
    updatedAt?: number;
    count?: number | null;
};

const LEVELS = new Set(["debug", "info", "warning", "error"]);

export function normalizeLogLevel(level: LogEntryInput["level"]): LogLevel {
    return typeof level === "string" && LEVELS.has(level) ? (level as LogLevel) : "info";
}

export function stringifyLogValue(value: any) {
    if (!value) return "";
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value, null, 4);
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
    if (value === null || typeof value !== "object") return JSON.stringify(value);

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }

    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
}

export function createLogFingerprint(input: LogEntryInput): string {
    const level = normalizeLogLevel(input.level);
    const source = input.source ?? "app";
    const subject = normalizeLogSubject(input.subject);
    const type = input.type ?? null;
    const phase = input.phase ?? inferLogPhase({ type, source });
    const detail = stringifyLogValue(input.detail);
    const error = stringifyLogValue(input.error);

    const normalized = {
        source,
        type,
        level,
        subject,
        phase,
        title: input.title,
        summary: input.summary ?? input.title,
        detail,
        error
    };

    return createHash("sha1").update(stableStringify(normalized)).digest("hex");
}

export function createLogEntry(input: LogEntryInput): LogEntry {
    const now = input.updatedAt ?? Date.now();
    const level = normalizeLogLevel(input.level);
    const source = input.source ?? "app";
    const subject = normalizeLogSubject(input.subject);
    const type = input.type ?? null;
    const phase = input.phase ?? inferLogPhase({ type, source });
    const detail = stringifyLogValue(input.detail);
    const error = stringifyLogValue(input.error);
    const createdAt = input.createdAt ?? now;

    return {
        id: input.id ?? randomUUID(),
        type,
        source,
        level,
        subject,
        phase,
        title: input.title,
        summary: input.summary ?? input.title,
        detail: detail || undefined,
        error: error || undefined,
        createdAt,
        updatedAt: now,
        count: input.count ?? 1
    };
}
