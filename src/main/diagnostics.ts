type DiagnosticLevel = "debug" | "info" | "warning" | "error";

type DiagnosticSubject = {
    id?: string;
    type?: string;
    instanceId?: string;
    [key: string]: any;
};

type DiagnosticPayload = {
    level?: DiagnosticLevel | string;
    title?: string;
    detail?: any;
    error?: any;
    source?: string;
    subject?: DiagnosticSubject | string | null;
    log?: boolean;
    dialogue?: boolean;
    editor?: boolean;
    logType?: string | null;
};

type DiagnosticReporterOptions = {
    makeLog?: (type: string, content: string) => Promise<string>;
    sendToEditor?: (channel: string, ...args: any[]) => void;
    getEditorWindow?: () => any;
    getMainWindow?: () => any;
    dialog?: {
        showMessageBox?: (browserWindowOrOptions: any, options?: any) => Promise<any>;
    };
};

const LEVELS = new Set(["debug", "info", "warning", "error"]);

function normalizeLevel(level: DiagnosticPayload["level"]): DiagnosticLevel {
    return typeof level === "string" && LEVELS.has(level) ? (level as DiagnosticLevel) : "info";
}

function stringify(value: any) {
    if (!value) return "";
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value, null, 4);
    } catch {
        return String(value);
    }
}

function normalizeSubject(subject: DiagnosticPayload["subject"]): DiagnosticSubject | null {
    if (!subject) return null;
    if (typeof subject === "string") return { id: subject };
    return subject;
}

function getSubjectLabel(subject: DiagnosticSubject | null) {
    if (!subject) return null;
    return [subject.id, subject.type, subject.instanceId].filter(Boolean).join(" / ") || null;
}

function getDialogType(level: DiagnosticLevel) {
    if (level === "error") return "error";
    if (level === "warning") return "warning";
    return "info";
}

export function createDiagnosticReporter({
    makeLog,
    sendToEditor,
    getEditorWindow,
    getMainWindow,
    dialog
}: DiagnosticReporterOptions) {
    return async function reportDiagnostic({
        level = "info",
        title = "Application message",
        detail = "",
        error = null,
        source = "app",
        subject = null,
        log = undefined,
        dialogue = false,
        editor = true,
        logType = null
    }: DiagnosticPayload = {}) {
        const normalizedLevel = normalizeLevel(level);
        const normalizedSubject = normalizeSubject(subject);
        const subjectLabel = getSubjectLabel(normalizedSubject);
        const detailText = [stringify(detail), stringify(error)].filter(Boolean).join("\n\n");
        let finalDetail = detailText;

        const shouldLog = log ?? normalizedLevel === "error";
        if (shouldLog && typeof makeLog === "function") {
            try {
                const logFile = await makeLog(
                    logType ?? `${source}-${normalizedLevel}`,
                    [
                        title,
                        source ? `Source: ${source}` : null,
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

        if (editor && typeof sendToEditor === "function") {
            sendToEditor("diagnostic-log", {
                level: normalizedLevel,
                title,
                detail: finalDetail,
                source,
                subject: normalizedSubject
            });
        }

        if (editor && source === "plugin" && typeof sendToEditor === "function") {
            sendToEditor("plugin-log", {
                level: normalizedLevel,
                title,
                detail: finalDetail,
                plugin: normalizedSubject
            });
        }

        if (!dialogue || !dialog?.showMessageBox) {
            return {
                level: normalizedLevel,
                title,
                detail: finalDetail,
                source,
                subject: normalizedSubject
            };
        }

        const parentWindow = getEditorWindow?.() ?? getMainWindow?.();
        await dialog.showMessageBox(parentWindow, {
            type: getDialogType(normalizedLevel),
            title,
            message: title,
            detail: finalDetail,
            noLink: true
        });

        return {
            level: normalizedLevel,
            title,
            detail: finalDetail,
            source,
            subject: normalizedSubject
        };
    };
}
