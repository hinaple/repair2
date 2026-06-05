import {
    normalizeLogLevel,
    normalizeLogSubject,
    stringifyLogValue,
    type LogEntryInput,
    type LogLevel
} from "./logEntry";
import { logStore } from "./logStore";

export type LogPayload = Omit<
    LogEntryInput,
    "title" | "logFile" | "createdAt" | "updatedAt" | "count"
> & {
    title?: string;
    log?: boolean;
    dialogue?: boolean;
    editor?: boolean;
    /** Compatibility alias. New code should use `type`. */
    logType?: string | null;
};

export type ReportLog = (payload: LogPayload) => Promise<any> | any;

type LogReporterOptions = {
    makeLog?: (type: string, content: string) => Promise<string>;
    sendToEditor?: (channel: string, ...args: any[]) => void;
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

export function createLogReporter({
    makeLog,
    sendToEditor,
    getEditorWindow,
    getMainWindow,
    dialog
}: LogReporterOptions): ReportLog {
    return async function reportLog({
        level = "info",
        title = "Application message",
        detail = "",
        error = null,
        source = "app",
        subject = null,
        log = undefined,
        dialogue = false,
        editor = true,
        type = null,
        logType = null,
        groupKey = null,
        phase = null,
        summary = null,
        status = null,
        toast = null,
        overlay = null
    }: LogPayload = {}) {
        const normalizedLevel = normalizeLogLevel(level);
        const normalizedSubject = normalizeLogSubject(subject);
        const normalizedSource = source ?? "app";
        const normalizedType = type ?? logType;
        const subjectLabel = getSubjectLabel(normalizedSubject);
        const detailText = [stringifyLogValue(detail), stringifyLogValue(error)]
            .filter(Boolean)
            .join("\n\n");
        let finalDetail = detailText;
        let logFile: string | undefined;

        const shouldLog = log ?? shouldLogByDefault(normalizedLevel);
        if (shouldLog && typeof makeLog === "function") {
            try {
                logFile = await makeLog(
                    normalizeLogSegment(normalizedType ?? `${normalizedSource}-${normalizedLevel}`),
                    [
                        title,
                        normalizedSource ? `Source: ${normalizedSource}` : null,
                        subjectLabel ? `Subject: ${subjectLabel}` : null,
                        normalizedSubject ? JSON.stringify(normalizedSubject, null, 4) : null,
                        detailText
                    ]
                        .filter(Boolean)
                        .join("\n\n")
                );
                finalDetail = [detailText, `Log file: ${logFile}`].filter(Boolean).join("\n\n");
            } catch {}
        }

        logStore.upsert({
            groupKey,
            type: normalizedType,
            source: normalizedSource,
            level: normalizedLevel,
            subject: normalizedSubject,
            phase,
            title,
            summary,
            detail,
            error,
            logFile,
            status,
            toast,
            overlay
        });

        if (editor && typeof sendToEditor === "function") {
            sendToEditor("diagnostic-log", {
                level: normalizedLevel,
                title,
                detail: finalDetail,
                source: normalizedSource,
                subject: normalizedSubject
            });
        }

        const result = {
            level: normalizedLevel,
            title,
            detail: finalDetail,
            source: normalizedSource,
            subject: normalizedSubject
        };

        if (!dialogue || !dialog?.showMessageBox) return result;

        const parentWindow = getEditorWindow?.() ?? getMainWindow?.();
        const messageBoxOptions = {
            type: getDialogType(normalizedLevel),
            title,
            message: title,
            detail: finalDetail,
            noLink: true
        };
        if (parentWindow) await dialog.showMessageBox(parentWindow, messageBoxOptions);
        else await dialog.showMessageBox(messageBoxOptions);

        return result;
    };
}
