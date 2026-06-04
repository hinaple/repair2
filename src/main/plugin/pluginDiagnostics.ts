import type { ReportDiagnostic } from "../diagnostics";
import type { LogStatus, LogToastPolicy } from "../logs/logEntry";
import type { PluginInfo, PluginType } from "./type";

type PluginLevel = "debug" | "info" | "warning" | "error";
type PluginSubject = {
    kind?: string;
    id?: string;
    type?: string;
    instanceId?: string;
    [key: string]: any;
};

type PluginReportPayload = {
    level?: PluginLevel;
    title: string;
    detail?: any;
    error?: any;
    source?: "plugin" | "plugin-link";
    subject?: PluginSubject | string | null;
    dialogue?: boolean;
    log?: boolean;
    logType: string;
    groupKey?: string | null;
    phase?: string | null;
    summary?: string | null;
    status?: LogStatus | null;
    toast?: LogToastPolicy | null;
    overlay?: boolean | null;
};

type PluginRef = Pick<PluginInfo, "name" | "type">;

const PLUGINS_SUBJECT = { kind: "project", id: "plugins" };

function pluginSubject(plugin: PluginRef): PluginSubject {
    return { kind: "plugin", id: plugin.name, type: plugin.type };
}

function pluginLinkSubject(pluginName: string, pluginType: PluginType | string): PluginSubject {
    if (!pluginName || pluginName === "unknown") return { ...PLUGINS_SUBJECT, type: "plugin-link" };
    return { kind: "plugin", id: pluginName, type: pluginType };
}

function pluginRuntimeMainKey(pluginName: string, action: string) {
    return `plugin:runtime-main:${pluginName}:${action}`;
}

export function createPluginDiagnostics(reportDiagnostic: ReportDiagnostic | null = null) {
    function report({
        level = "warning",
        source = "plugin",
        dialogue = false,
        ...payload
    }: PluginReportPayload) {
        return reportDiagnostic?.({ level, source, dialogue, ...payload });
    }

    function reportPlugin({
        plugin,
        code,
        phase,
        title,
        summary,
        detail,
        error,
        active = false,
        overlay = false,
        level = "error",
        groupKey
    }: {
        plugin: PluginRef;
        code: string;
        phase: string;
        title: string;
        summary: string;
        detail?: any;
        error?: any;
        active?: boolean;
        overlay?: boolean;
        level?: PluginLevel;
        groupKey?: string;
    }) {
        return report({
            level,
            title,
            detail,
            error,
            subject: pluginSubject(plugin),
            logType: code,
            groupKey,
            phase,
            summary,
            status: active ? "active" : null,
            overlay
        });
    }

    function reportPluginLink({
        title,
        summary,
        detail,
        error,
        subject,
        logType,
        groupKey,
        level = "warning"
    }: {
        title: string;
        summary: string;
        detail?: any;
        error?: any;
        subject: PluginSubject;
        logType: string;
        groupKey: string;
        level?: PluginLevel;
    }) {
        return report({
            level,
            title,
            detail,
            error,
            source: "plugin-link",
            subject,
            logType,
            groupKey,
            phase: "link",
            summary
        });
    }

    return {
        report,
        manifestInvalid({
            dir,
            detail,
            error,
            reason
        }: {
            dir: string;
            detail?: string;
            error?: any;
            reason?: string;
        }) {
            return report({
                level: "warning",
                title: "Plugin manifest is invalid.",
                detail: detail ?? `Plugin directory: ${dir}`,
                error,
                subject: { kind: "plugin", id: dir, type: "unknown", reason },
                logType: "plugin-manifest-warning",
                groupKey: `plugin:manifest:${dir}`,
                phase: "manifest",
                summary: `Plugin manifest is invalid: ${dir}`,
                status: "active",
                overlay: true
            });
        },
        duplicatedName(name: string) {
            return report({
                level: "warning",
                title: "Duplicated plugin name.",
                detail: `Plugin name: ${name}`,
                subject: { kind: "plugin", id: name },
                logType: "plugin-duplicated-name-warning",
                groupKey: `plugin:duplicated-name:${name}`,
                phase: "manifest",
                summary: `Duplicated plugin name: ${name}`,
                status: "active",
                overlay: true
            });
        },
        pluginLinksWarning(title: string, reason?: string) {
            return report({
                level: "warning",
                title,
                detail: reason,
                logType: "plugin-links-warning",
                groupKey: `plugin:links:${title}`,
                phase: "link",
                summary: title
            });
        },
        pluginInfoMissing() {
            return report({
                level: "warning",
                title: "Old plugin info doesn't exist",
                logType: "plugin-manifest-warning",
                groupKey: "plugin:manifest:old-plugin-info-missing",
                phase: "manifest",
                summary: "Old plugin info doesn't exist"
            });
        },
        buildFailed(pluginInfo: PluginRef, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-build-error",
                groupKey: `plugin:build:${pluginInfo.name}`,
                phase: "build",
                title: "Plugin build failed.",
                summary: `${pluginInfo.name} build failed`,
                detail: `Plugin: ${pluginInfo.name}`,
                error,
                active: true,
                overlay: true
            });
        },
        linkedManifestLoadFailed({
            manifestPath,
            reason,
            detail,
            error
        }: {
            manifestPath: string;
            reason?: string;
            detail?: string;
            error?: any;
        }) {
            return reportPluginLink({
                level: "error",
                title: "Linked plugin manifest could not be loaded.",
                summary: "Linked plugin manifest could not be loaded",
                detail: { manifestPath, reason, detail },
                error,
                subject: { ...PLUGINS_SUBJECT, type: "plugin-source", manifestPath },
                logType: "plugin-link-manifest",
                groupKey: `plugin-link:manifest:${manifestPath}`
            });
        },
        linkedManifestCopyFailed({
            pluginName,
            pluginType,
            sourceManifest,
            destManifest,
            error
        }: {
            pluginName: string;
            pluginType: PluginType | string;
            sourceManifest: string;
            destManifest: string;
            error?: any;
        }) {
            return reportPluginLink({
                level: "error",
                title: "Linked plugin manifest could not be copied.",
                summary: `Linked plugin manifest could not be copied: ${pluginName}`,
                detail: { pluginName, sourceManifest, destManifest },
                error,
                subject: pluginLinkSubject(pluginName, pluginType),
                logType: "plugin-link-copy",
                groupKey: `plugin-link:copy:${pluginName}`
            });
        },
        duplicateLink({
            pluginName,
            pluginType,
            currentSourcePath,
            requestedSourcePath
        }: {
            pluginName: string;
            pluginType: PluginType | string;
            currentSourcePath: string;
            requestedSourcePath: string;
        }) {
            return reportPluginLink({
                title: "Plugin source is already linked.",
                summary: `Plugin source is already linked: ${pluginName}`,
                detail: { pluginName, currentSourcePath, requestedSourcePath },
                subject: pluginLinkSubject(pluginName, pluginType),
                logType: "plugin-link-duplicate",
                groupKey: `plugin-link:duplicate:${pluginName}`
            });
        },
        linkRegistryInvalid(linksFilePath: string) {
            return reportPluginLink({
                title: "Plugin link registry is invalid.",
                summary: "Plugin link registry is invalid",
                detail: { linksFilePath },
                subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                logType: "plugin-link-registry",
                groupKey: "plugin-link:registry:invalid"
            });
        },
        linkRegistryReadFailed(linksFilePath: string, error: any) {
            return reportPluginLink({
                title: "Plugin link registry could not be read.",
                summary: "Plugin link registry could not be read",
                detail: { linksFilePath },
                error,
                subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                logType: "plugin-link-registry",
                groupKey: "plugin-link:registry:read"
            });
        },
        linkRegistrySaveFailed(linksFilePath: string, error: any) {
            return reportPluginLink({
                level: "error",
                title: "Plugin link registry could not be saved.",
                summary: "Plugin link registry could not be saved",
                detail: { linksFilePath },
                error,
                subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                logType: "plugin-link-save",
                groupKey: "plugin-link:registry:save"
            });
        },
        runtimeMainFactoryFailed(pluginInfo: PluginRef, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-factory-error",
                groupKey: pluginRuntimeMainKey(pluginInfo.name, "factory"),
                phase: "runtime-main",
                title: "Runtime main plugin factory failed.",
                summary: `${pluginInfo.name} runtime main factory failed`,
                detail: `Plugin: ${pluginInfo.name}`,
                error,
                active: true,
                overlay: true
            });
        },
        runtimeMainMethodFailed(pluginInfo: PluginRef, methodName: string, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-method-error",
                groupKey: pluginRuntimeMainKey(pluginInfo.name, `method:${methodName}`),
                phase: "runtime-main",
                title: "Runtime main plugin method failed.",
                summary: `${pluginInfo.name} runtime main method failed: ${methodName}`,
                detail: `Plugin: ${pluginInfo.name}\nMethod: ${methodName}`,
                error,
                active: true,
                overlay: true
            });
        },
        runtimeMainDisposerFailed(pluginInfo: PluginRef, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-disposer-error",
                groupKey: pluginRuntimeMainKey(pluginInfo.name, "disposer"),
                phase: "runtime-main",
                title: "Runtime main plugin disposer failed.",
                summary: `${pluginInfo.name} runtime main disposer failed`,
                detail: `Plugin: ${pluginInfo.name}`,
                error
            });
        },
        runtimeMainLoadFailed(pluginInfo: PluginRef, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-load-error",
                groupKey: pluginRuntimeMainKey(pluginInfo.name, "load"),
                phase: "runtime-main",
                title: "Runtime main plugin load failed.",
                summary: `${pluginInfo.name} runtime main load failed`,
                detail: `Plugin: ${pluginInfo.name}`,
                error,
                active: true,
                overlay: true
            });
        },
        runtimeMainDisposeFailed(pluginInfo: PluginRef, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-dispose-error",
                groupKey: pluginRuntimeMainKey(pluginInfo.name, "dispose"),
                phase: "runtime-main",
                title: "Runtime main plugin dispose failed.",
                summary: `${pluginInfo.name} runtime main dispose failed`,
                detail: `Plugin: ${pluginInfo.name}`,
                error
            });
        }
    };
}

export type PluginDiagnostics = ReturnType<typeof createPluginDiagnostics>;
