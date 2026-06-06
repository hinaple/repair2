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

export type LogEntry = {
    id: string;
    type?: string | null;
    source: LogSource;
    level: LogLevel;
    subject: LogSubject | null;
    phase?: string | null;
    title: string;
    summary: string;
    detail?: string;
    error?: string;
    createdAt: number;
    updatedAt: number;
    count: number;
};

export type LogChange =
    | { type: "append"; entry: LogEntry }
    | { type: "update"; entry: LogEntry };

export type LogListFilter = {
    source?: string;
    level?: LogLevel | LogLevel[];
    subjectId?: string;
    subjectKind?: string;
};
