import { createHash } from "node:crypto";
import type { LogEntryInput } from "./logEntry";

const CUSTOM_LOG_GROUP_WINDOW_MS = 5000;
type ProjectLogPayload = LogEntryInput & { editor?: boolean };

export function createProjectCustomLogReporter(reportLog: (payload: ProjectLogPayload) => any) {
    let lastContent: string | null = null;
    let lastGroupKey: string | null = null;
    let lastAt = 0;

    return function reportProjectCustomLog(content: any) {
        const normalizedContent = String(content ?? "");
        const firstLine = normalizedContent.split(/\r?\n/, 1)[0] || "Project log";
        const contentHash = createHash("sha1").update(normalizedContent).digest("hex").slice(0, 12);
        const now = Date.now();
        const groupKey =
            normalizedContent === lastContent && now - lastAt <= CUSTOM_LOG_GROUP_WINDOW_MS
                ? lastGroupKey
                : `project:custom-log:${now}:${contentHash}`;

        lastContent = normalizedContent;
        lastGroupKey = groupKey;
        lastAt = now;

        return reportLog({
            source: "project",
            level: "info",
            type: "project-custom-log",
            subject: { kind: "project" },
            phase: "runtime",
            title: "Project log",
            summary: firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine,
            detail: normalizedContent,
            status: "resolved",
            toast: "transient",
            groupKey,
            editor: false
        });
    };
}
