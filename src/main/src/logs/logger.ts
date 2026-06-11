import type { LogEntry, LogFrom, LogSource, LogSubject } from "@shared/log.types";
import type { LogPayload, ReportLog } from "./reportLog";

const LogLevels = ["debug", "info", "warning", "error"] as const;
type LoggerMethod = (...args: {}[]) => LogEntry | undefined;
type LoggerOption = Omit<LogPayload, "content" | "level" | "log">;
type LoggerMethods = Record<(typeof LogLevels)[number], LoggerMethod>;
type Logger = {
    source: (source: LogSource) => Logger;
    dialog: (showDialog?: boolean) => Logger;
    phase: (phase: string) => Logger;
    type: (type: string) => Logger;
    subject: (subject: LogSubject) => Logger;
    from: (from: LogFrom) => Logger;
    with: (payload: LoggerOption) => Logger;
} & LoggerMethods;

let scopedLog: ReportLog;

function createLogger(payload: LoggerOption): Logger {
    const methods = Object.fromEntries(
        LogLevels.map((l) => [
            l,
            (...args: ({} | null | undefined)[]) => baseLogger(l, payload, args)
        ])
    ) as LoggerMethods;
    const currentCreateLogger = (p: LoggerOption) => createLogger({ ...payload, ...p });
    return {
        source: (source) => currentCreateLogger({ source }),
        dialog: (dialog = true) => currentCreateLogger({ dialog }),
        phase: (phase) => currentCreateLogger({ phase }),
        type: (type) => currentCreateLogger({ type }),
        subject: (subject) => currentCreateLogger({ subject }),
        from: (from) => currentCreateLogger({ from }),
        with: currentCreateLogger,
        ...methods
    };
}

const LV_CLI_MAP: Record<(typeof LogLevels)[number], "log" | "warn" | "error"> = {
    debug: "log",
    info: "log",
    warning: "warn",
    error: "error"
} as const;

function baseLogger(
    level: (typeof LogLevels)[number],
    payload: LoggerOption,
    args: ({} | null | undefined)[]
): LogEntry | undefined {
    console[LV_CLI_MAP[level]](...args);
    if (!scopedLog) return;

    let dialog = false;
    return scopedLog({
        type: `main-log:${level}`,
        dialog,
        source: "app",
        ...payload,
        content: args,
        level
    });
}

export function registerLogger(reportLog: ReportLog) {
    scopedLog = reportLog;
}

export const logger = createLogger({});
