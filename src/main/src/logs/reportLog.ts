import { logStore } from "./logStore";
import {
    normalizeLogLevel,
    normalizeLogSubject,
    stringifyLogValue,
    type LogEntry,
    type LogLevel
} from "./logEntry";
import type { LogContent } from "@shared/logContent";
import type { MessageBoxOptions } from "electron";
import type { LogEntryInput } from "@shared/log.types";

export type LogPayload = Omit<LogEntryInput, "createdAt" | "updatedAt" | "count"> & {
    log?: boolean;
    dialogue?: boolean;
};

type LogReporterOptions = {
    makeLogFile?: (type: string, content: string) => Promise<string>;
    getEditorWindow?: () => any;
    getMainWindow?: () => any;
    dialog?: {
        showMessageBox?: (browserWindowOrOptions: any, options?: MessageBoxOptions) => Promise<any>;
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
    source,
    subject,
    subjectLabel,
    detailText
}: {
    source: string;
    subject: ReturnType<typeof normalizeLogSubject>;
    subjectLabel: string | null;
    detailText: string;
}) {
    return [
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
    source,
    subject,
    subjectLabel,
    detailText
}: {
    makeLogFile?: (type: string, content: string) => Promise<string>;
    type: string;
    source: string;
    subject: ReturnType<typeof normalizeLogSubject>;
    subjectLabel: string | null;
    detailText: string;
}) {
    if (typeof makeLogFile !== "function") return;

    makeLogFile(
        normalizeLogSegment(type),
        makeLogFileContent({ source, subject, subjectLabel, detailText })
    ).catch(() => {});
}

export type ReportLog = (
    payload: LogPayload | (LogPayload & { content: LogContent }),
    processedDetail?: boolean
) => LogEntry;

export function createLogReporter({
    makeLogFile,
    getEditorWindow,
    getMainWindow,
    dialog
}: LogReporterOptions): ReportLog {
    function reportLog(
        {
            level = "info",
            content = null,
            source = "app",
            subject = null,
            log = undefined,
            dialogue = false,
            type = null,
            phase = null,
            from
        }: LogPayload | (LogPayload & { content: LogContent }),
        processedInput = false
    ): LogEntry {
        const normalizedLevel = normalizeLogLevel(level);
        const normalizedSubject = normalizeLogSubject(subject);
        const normalizedSource = source ?? "app";
        const normalizedType = type ?? `${normalizedSource}-log`;
        const subjectLabel = getSubjectLabel(normalizedSubject);

        const entry = logStore.record(
            {
                type: normalizedType,
                source: normalizedSource,
                level: normalizedLevel,
                subject: normalizedSubject,
                phase,
                content,
                from
            },
            processedInput
        );
        const detailText = stringifyLogValue(entry.content);

        if (log ?? shouldLogByDefault(normalizedLevel)) {
            writeLogFileLater({
                makeLogFile,
                type: normalizedType,
                source: normalizedSource,
                subject: normalizedSubject,
                subjectLabel,
                detailText
            });
        }

        if (dialogue && dialog?.showMessageBox) {
            const parentWindow = getEditorWindow?.() ?? getMainWindow?.();
            const messageBoxOptions: MessageBoxOptions = {
                type: getDialogType(entry.level),
                title: "Repair2",
                message: `${entry.level} at ${entry.source}`,
                detail: detailText,
                noLink: true
            };
            if (parentWindow) dialog.showMessageBox(parentWindow, messageBoxOptions);
            else dialog.showMessageBox(messageBoxOptions);
        }

        return entry;
    }

    return reportLog;
}
