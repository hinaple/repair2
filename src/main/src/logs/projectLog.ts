import type { ReportLog } from "./reportLog";

export function createProjectCustomLogReporter(reportLog: ReportLog) {
    return function reportProjectCustomLog(content: any) {
        const normalizedContent = String(content ?? "");
        // const firstLine = normalizedContent.split(/\r?\n/, 1)[0] || "Project log";

        return reportLog({
            source: "project",
            level: "info",
            type: "project-custom-log",
            subject: { kind: "project" },
            phase: "runtime",
            content: normalizedContent
        });
    };
}
