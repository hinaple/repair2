import { ipcRenderer } from "electron";
import { reportLog } from "../logClient";
import { customLog } from "../logger";

import type { LogLevel, LogSubject } from "@shared/log.types";
import type { PluginErrorPayload, PluginType } from "@shared/plugin.types";

type PluginSource = { id: string; type: PluginType; instanceId: string };

function stringify(value: any) {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function normalizePluginSubject(plugin: PluginSource): LogSubject | null {
    if (!plugin) return null;
    return {
        kind: "plugin",
        id: plugin.id,
        type: plugin.type,
        instanceId: plugin.instanceId
    };
}

type PluginLogPayload = {
    level: LogLevel;
    source: PluginSource;
    type?: string;
    phase?: string;
    content: any[];
};

export function sendPluginLog({
    level = "info",
    source,
    type,
    phase = "user",
    content = []
}: PluginLogPayload) {
    reportLog({
        level,
        source: "plugin",
        subject: normalizePluginSubject(source),
        content,
        type: type ?? `plugin-${level}`,
        phase
    });
    customLog(
        `PLUGIN: ${source?.id ?? "unknown"}\n${Array.isArray(content) ? content.map(String).join(" ") : content}`
    );
}

export function reportPluginWarning(
    pluginSource: PluginSource,
    content: any[],
    options: Partial<PluginLogPayload> = {}
) {
    sendPluginLog({
        level: "warning",
        source: pluginSource,
        content,
        ...options
    });
}

export function reportPluginException(
    pluginSource: PluginSource,
    title: string,
    error: any,
    { type, phase, summary }: { type?: string; phase?: string; summary?: string } = {},
    activeError: boolean = false
) {
    const payload: PluginErrorPayload = {
        name: pluginSource.id,
        type: pluginSource.type,
        logType: type,
        title,
        error,
        summary: summary ?? title,
        phase,
        activeError
    };
    ipcRenderer.invoke("plugin:runtime-error", payload);
}
