import type { LogEntry } from "@shared/log.types";
import type { ReportLog } from "./reportLog";
import { cli, CliLogTypes } from "./console";

const LogLevels = ["debug", "info", "warning", "error", "crash"] as const;
type Logger = (...args: {}[]) => LogEntry | undefined;

let scopedLog: ReportLog;

export const logger = Object.fromEntries(
    LogLevels.map((l) => [l, (...args: ({} | null | undefined)[]) => baseLogger(l, args)])
) as Record<(typeof LogLevels)[number], Logger>;

const LV_CLI_MAP: Record<(typeof LogLevels)[number], CliLogTypes> = {
    debug: "status",
    info: "info",
    warning: "warning",
    error: "error",
    crash: "error"
};

function baseLogger(
    level: (typeof LogLevels)[number],
    args: ({} | null | undefined)[]
): LogEntry | undefined {
    cli[LV_CLI_MAP[level]](args.map(String).join(" "));
    if (!scopedLog) return;

    let dialogue = false;
    if (level === "crash") {
        level = "error";
        dialogue = true;
    }
    return scopedLog({
        level,
        type: `main-log:${level}`,
        source: "app",
        content: args,
        dialogue
    });
}

export function registerLogger(reportLog: ReportLog) {
    scopedLog = reportLog;
}
