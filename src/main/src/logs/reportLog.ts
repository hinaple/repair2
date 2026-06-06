import {
    normalizeLogLevel,
    normalizeLogSubject,
    stringifyLogValue,
    type LogEntry,
    type LogEntryInput,
    type LogLevel
} from "./logEntry";
import { logStore } from "./logStore";

export type LogPayload = Omit<LogEntryInput, "title" | "createdAt" | "updatedAt" | "count"> & {
    title?: string;
    log?: boolean;
    dialogue?: boolean;
};

export type ReportLog = (payload?: LogPayload) => LogEntry;

type LogReporterOptions = {
    makeLogFile?: (type: string, content: string) => Promise<string>;
    getEditorWindow?: () => any;
    getMainWindow?: () => any;
    dialog?: {
        showMessageBox?: (browserWindowOrOptions: any, options?: any) => Promise<any>;
    };
};

const LOG_SEGMENT_MAX_LENGTH = 16;

function getSubjectLabel(subject: ReturnType<typeof normalizeLogSubject>) {
    if (!subject) return null;
    return [subject.id, subject.type, subject.instanceId].filter(Boolean).join(" / ") || null;
}

function getDialogType(level: LogLevel) {
    if (level === "error") return "error";
    if (level === "warning") return "warning";
    return "info";
}

function compactSegment(value: string) {
    if (value.length <= LOG_SEGMENT_MAX_LENGTH) return value;

    const sideLength = Math.floor((LOG_SEGMENT_MAX_LENGTH - 4) / 2);
    const left = value.slice(0, sideLength);
    const right = value.slice(value.length - sideLength);
    return `${left}....${right}`;
}

function normalizeLogSegment(value: string) {
    const normalized = value
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return compactSegment(normalized || "log");
}

function shouldLogByDefault(level: LogLevel) {
    return level === "error" || level === "warning";
}

function makeLogFileContent({
    title,
    source,
    subject,
    subjectLabel,
    detailText
}: {
    title: string;
    source: string;
    subject: ReturnType<typeof normalizeLogSubject>;
    subjectLabel: string | null;
    detailText: string;
}) {
    return [
        title,
        source ? `Source: ${source}` : null,
        subjectLabel ? `Subject: ${subjectLabel}` : null,
        subject ? JSON.stringify(subject, null, 4) : null,
        detailText
    ]
        .filter(Boolean)
        .join("\n\n");
}

function writeLogFileLater({
    makeLogFile,
    type,
    title,
    source,
    subject,
    subjectLabel,
    detailText
}: {
    makeLogFile?: (type: string, content: string) => Promise<string>;
    type: string;
    title: string;
    source: string;
    subject: ReturnType<typeof normalizeLogSubject>;
    subjectLabel: string | null;
    detailText: string;
}) {
    if (typeof makeLogFile !== "function") return;

    makeLogFile(
        normalizeLogSegment(type),
        makeLogFileContent({ title, source, subject, subjectLabel, detailText })
    ).catch(() => {});
}

export function createLogReporter({
    makeLogFile,
    getEditorWindow,
    getMainWindow,
    dialog
}: LogReporterOptions): ReportLog {
    return function reportLog({
        level = "info",
        title = "Application message",
        detail = "",
        error = null,
        source = "app",
        subject = null,
        log = undefined,
        dialogue = false,
        type = null,
        phase = null,
        summary = null
    }: LogPayload = {}) {
        const normalizedLevel = normalizeLogLevel(level);
        const normalizedSubject = normalizeLogSubject(subject);
        const normalizedSource = source ?? "app";
        const normalizedType = type ?? `${normalizedSource}-log`;
        const subjectLabel = getSubjectLabel(normalizedSubject);
        const detailText = [stringifyLogValue(detail), stringifyLogValue(error)]
            .filter(Boolean)
            .join("\n\n");

        const entry = logStore.record({
            type: normalizedType,
            source: normalizedSource,
            level: normalizedLevel,
            subject: normalizedSubject,
            phase,
            title,
            summary,
            detail,
            error
        });

        if (log ?? shouldLogByDefault(normalizedLevel)) {
            writeLogFileLater({
                makeLogFile,
                type: normalizedType,
                title,
                source: normalizedSource,
                subject: normalizedSubject,
                subjectLabel,
                detailText
            });
        }

        if (dialogue && dialog?.showMessageBox) {
            const parentWindow = getEditorWindow?.() ?? getMainWindow?.();
            const messageBoxOptions = {
                type: getDialogType(normalizedLevel),
                title,
                message: title,
                detail: detailText,
                noLink: true
            };
            if (parentWindow) dialog.showMessageBox(parentWindow, messageBoxOptions);
            else dialog.showMessageBox(messageBoxOptions);
        }

        return entry;
    };
}
