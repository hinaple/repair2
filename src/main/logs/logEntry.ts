import { randomUUID } from "node:crypto";

export type LogLevel = "debug" | "info" | "warning" | "error";
export type LogStatus = "active" | "resolved";
export type LogToastPolicy = "none" | "transient" | "persistent";

export type LogSource =
    | "plugin"
    | "plugin-link"
    | "project"
    | "app"
    | "editor"
    | "play"
    | "communication"
    | string;

export type LogSubject = {
    kind?: string;
    id?: string;
    type?: string;
    instanceId?: string;
    [key: string]: any;
};

export type LogEntry = {
    id: string;
    groupKey: string;
    type?: string | null;
    source: LogSource;
    level: LogLevel;
    subject: LogSubject | null;
    phase?: string | null;
    title: string;
    summary: string;
    detail?: string;
    error?: string;
    logFile?: string;
    createdAt: number;
    updatedAt: number;
    status: LogStatus;
    count: number;
    toast: LogToastPolicy;
    overlay: boolean;
};

export type LogEntryInput = {
    id?: string;
    groupKey?: string | null;
    type?: string | null;
    source?: LogSource | null;
    level?: LogLevel | string | null;
    subject?: LogSubject | string | null;
    phase?: string | null;
    title: string;
    summary?: string | null;
    detail?: any;
    error?: any;
    logFile?: string | null;
    createdAt?: number;
    updatedAt?: number;
    status?: LogStatus | null;
    toast?: LogToastPolicy | null;
    overlay?: boolean | null;
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

function getSubjectGroupSegment(subject: LogSubject | null) {
    if (!subject) return "none";
    return [subject.kind, subject.id, subject.type, subject.instanceId].filter(Boolean).join("/");
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

export function getDefaultToastPolicy(level: LogLevel, status: LogStatus): LogToastPolicy {
    if (level === "error" && status === "active") return "persistent";
    if (level === "error") return "transient";
    if (level === "warning") return "transient";
    return "none";
}

export function getDefaultLogStatus(): LogStatus {
    return "resolved";
}

export function createLogGroupKey(input: {
    type?: string | null;
    source?: string | null;
    level?: LogLevel | string | null;
    subject?: LogSubject | string | null;
    phase?: string | null;
    title?: string | null;
}) {
    const level = normalizeLogLevel(input.level);
    const subject = normalizeLogSubject(input.subject);
    const phase = input.phase ?? inferLogPhase({ type: input.type, source: input.source });

    return [
        input.source ?? "app",
        input.type ?? "log",
        level,
        phase ?? "none",
        getSubjectGroupSegment(subject),
        input.title ?? "Log entry"
    ].join(":");
}

export function createLogEntry(input: LogEntryInput, previous: LogEntry | null = null): LogEntry {
    const now = input.updatedAt ?? Date.now();
    const level = normalizeLogLevel(input.level);
    const source = input.source ?? "app";
    const subject = normalizeLogSubject(input.subject);
    const type = input.type ?? null;
    const phase = input.phase ?? inferLogPhase({ type, source });
    const detail = stringifyLogValue(input.detail);
    const error = stringifyLogValue(input.error);
    const createdAt = previous?.createdAt ?? input.createdAt ?? now;

    const status = input.status ?? getDefaultLogStatus();

    return {
        id: previous?.id ?? input.id ?? randomUUID(),
        groupKey:
            input.groupKey ??
            previous?.groupKey ??
            createLogGroupKey({ type, source, level, subject, phase, title: input.title }),
        type,
        source,
        level,
        subject,
        phase,
        title: input.title,
        summary: input.summary ?? input.title,
        detail: detail || undefined,
        error: error || undefined,
        logFile: input.logFile ?? previous?.logFile,
        createdAt,
        updatedAt: now,
        status,
        count: input.count ?? (previous ? previous.count + 1 : 1),
        toast: input.toast ?? getDefaultToastPolicy(level, status),
        overlay: input.overlay ?? previous?.overlay ?? false
    };
}
