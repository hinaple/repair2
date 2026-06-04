import { reportLog } from "../logClient";
import { customLog } from "../logger";

function stringify(value) {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function normalizePluginSubject(plugin) {
    if (!plugin) return null;
    return {
        kind: "plugin",
        id: plugin.id,
        type: plugin.type,
        instanceId: plugin.instanceId
    };
}

export function sendPluginLog({
    level = "info",
    source = null,
    title,
    detail = null,
    dialogue = false,
    type = null,
    groupKey = null,
    phase = "user",
    summary = null,
    status = null,
    toast = null,
    overlay = null
}) {
    reportLog({
        level,
        source: "plugin",
        subject: normalizePluginSubject(source),
        title,
        summary: summary ?? title,
        detail,
        dialogue,
        logType: type ?? `plugin-${level}`,
        groupKey:
            groupKey ??
            (source?.id
                ? `plugin:${phase}:${source.id}:${level}:${title}`
                : `plugin:${phase}:unknown:${level}:${title}`),
        phase,
        status: status ?? "resolved",
        toast,
        overlay: overlay ?? false
    });
    customLog(`PLUGIN: ${source?.id ?? "unknown"}\n${title}`);
}

export function reportPluginIssue(source, title, detail = null, level = "warning", options = {}) {
    sendPluginLog({
        level,
        source,
        title: `[Plugin ${level}] ${title}`,
        detail,
        dialogue: level === "error" || level === "warning",
        ...options
    });
}

export function reportPluginException(source, title, error, options = {}) {
    reportPluginIssue(source, title, stringify(error), "error", options);
}
