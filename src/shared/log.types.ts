import type { LogContent } from "./logContent";

export type LogLevel = "debug" | "info" | "warning" | "error";

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

export type LogFrom = {
    filename: string;
    lineNumber?: number;
    columnNumber?: number;
    stack?: string;
};

export type LogEntry = {
    id: string;
    type?: string | null;
    source: LogSource;
    level: LogLevel;
    content: LogContent;
    from?: LogFrom;
    subject: LogSubject | null;
    phase?: string | null;
    createdAt: number;
    updatedAt: number;
    count: number;
};

export type LogChange = { type: "append"; entry: LogEntry } | { type: "update"; entry: LogEntry };

export type LogListFilter = {
    source?: string;
    level?: LogLevel | LogLevel[];
    subjectId?: string;
    subjectKind?: string;
};

export type LogEntryInput = {
    type?: string | null;
    phase?: string | null;
    id?: string;
    source?: LogSource | null;
    level?: LogLevel | string | null;
    subject?: LogSubject | string | null;
    content: any;
    from?: LogFrom;
    createdAt?: number;
    updatedAt?: number;
    count?: number | null;
};

export type LogEntryInputWithContent = LogEntryInput & {
    content: LogContent;
};
