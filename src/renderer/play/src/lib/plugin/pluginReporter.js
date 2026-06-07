import { ipcRenderer } from "electron";
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
    type = null,
    phase = "user",
    summary = null
}) {
    reportLog({
        level,
        source: "plugin",
        subject: normalizePluginSubject(source),
        title,
        summary: summary ?? title,
        detail,
        dialogue: false,
        type: type ?? `plugin-${level}`,
        phase
    });
    customLog(`PLUGIN: ${source?.id ?? "unknown"}\n${title}`);
}

export function reportPluginWarning(source, title, detail = null, options = {}) {
    sendPluginLog({
        level,
        source,
        title: `[Plugin ${level}] ${title}`,
        detail,
        ...options
    });
}

export function reportPluginException(plugin, title, error, logOptions = {}) {
    ipcRenderer.invoke("plugin:runtime-error", {
        name: plugin.id,
        type: plugin.type,
        title,
        error,
        logOptions
    });
    // reportPluginWarning(source, title, stringify(error), "error", options);
}
