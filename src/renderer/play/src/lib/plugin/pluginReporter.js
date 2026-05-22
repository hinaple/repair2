import { ipcRenderer } from "electron";
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

function getPluginLabel(source) {
    if (!source) return "unknown";
    return [source.id, source.type, source.instanceId].filter(Boolean).join(" / ");
}

export function sendPluginLog({
    level = "info",
    source = null,
    title,
    detail = null,
    dialogue = false
}) {
    ipcRenderer.send("plugin-log", {
        level,
        plugin: source,
        title,
        detail,
        dialogue
    });
    customLog(`PLUGIN: ${source?.id ?? "unknown"}\n${title}`);
}

export function reportPluginIssue(source, title, detail = null, level = "warning") {
    sendPluginLog({
        level,
        source,
        title: `[Plugin ${level}] ${title}`,
        detail,
        dialogue: level === "error" || level === "warning"
    });
}

export function reportPluginException(source, title, error) {
    reportPluginIssue(source, title, stringify(error), "error");
}
