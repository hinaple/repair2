import type { LogPayload, ReportLog } from "../logs/reportLog";
import type { LogLevel, LogSubject } from "../logs/logEntry";
import type { PluginInfo, PluginType } from "./type";
import { PluginReportOptions } from "@shared/plugin.types";
import { stripVTControlCharacters } from "util";

type PluginReportPayload = Omit<LogPayload, "source" | "title" | "type"> & {
    level?: LogLevel;
    title: string;
    source?: "plugin" | "plugin-link";
    type: string;
};

type PluginRef = Pick<PluginInfo, "name" | "type">;

const PLUGINS_SUBJECT = { kind: "project", id: "plugins" };

function pluginSubject(plugin: PluginRef): LogSubject {
    return { kind: "plugin", id: plugin.name, type: plugin.type };
}

function pluginLinkSubject(pluginName: string, pluginType: PluginType | string): LogSubject {
    if (!pluginName || pluginName === "unknown") return { ...PLUGINS_SUBJECT, type: "plugin-link" };
    return { kind: "plugin", id: pluginName, type: pluginType };
}

export function createPluginDiagnostics(reportLog: ReportLog) {
    function report({ level = "warning", source = "plugin", ...payload }: PluginReportPayload) {
        return reportLog?.({ level, source, dialogue: false, ...payload });
    }

    function reportPlugin({
        plugin,
        code,
        phase,
        title,
        summary,
        detail,
        error,
        level = "error"
    }: {
        plugin: PluginRef;
        code: string;
        phase: string;
        title: string;
        summary: string;
        detail?: any;
        error?: any;
        level?: LogLevel;
    }) {
        return report({
            level,
            title,
            detail,
            error,
            subject: pluginSubject(plugin),
            type: code,
            phase,
            summary
        });
    }

    function reportPluginLink({
        title,
        summary,
        detail,
        error,
        subject,
        type,
        level = "warning"
    }: {
        title: string;
        summary: string;
        detail?: any;
        error?: any;
        subject: LogSubject;
        type: string;
        level?: LogLevel;
    }) {
        return report({
            level,
            title,
            detail,
            error,
            source: "plugin-link",
            subject,
            type,
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
                type: "plugin-manifest-warning",
                phase: "manifest",
                summary: `Plugin manifest is invalid: ${dir}`
            });
        },
        duplicatedName(name: string) {
            return report({
                level: "warning",
                title: "Duplicated plugin name.",
                detail: `Plugin name: ${name}`,
                subject: { kind: "plugin", id: name },
                type: "plugin-duplicated-name-warning",
                phase: "manifest",
                summary: `Duplicated plugin name: ${name}`
            });
        },
        pluginLinksWarning(title: string, reason?: string) {
            return report({
                level: "warning",
                title,
                detail: reason,
                type: "plugin-links-warning",
                phase: "link",
                summary: title
            });
        },
        pluginInfoMissing() {
            return report({
                level: "warning",
                title: "Old plugin info doesn't exist",
                type: "plugin-manifest-warning",
                phase: "manifest",
                summary: "Old plugin info doesn't exist"
            });
        },
        buildFailed(
            pluginInfo: PluginRef,
            error: any,
            title = "Plugin build failed.",
            reportOptions?: PluginReportOptions
        ) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-build-error",
                phase: "build",
                title,
                summary: `${pluginInfo.name} build failed`,
                detail: `Plugin: ${pluginInfo.name}`,
                error,
                ...reportOptions
            });
        },
        runtimeError(
            pluginInfo: PluginRef,
            error: any,
            title: string = "Plugin runtime error occurred.",
            reportOptions?: PluginReportOptions
        ) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-error",
                phase: "runtime",
                title,
                summary: title,
                detail: `Plugin: ${pluginInfo.name}`,
                error,
                ...reportOptions
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
                type: "plugin-link-manifest"
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
                type: "plugin-link-copy"
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
                type: "plugin-link-duplicate"
            });
        },
        linkRegistryInvalid(linksFilePath: string) {
            return reportPluginLink({
                title: "Plugin link registry is invalid.",
                summary: "Plugin link registry is invalid",
                detail: { linksFilePath },
                subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                type: "plugin-link-registry"
            });
        },
        linkRegistryReadFailed(linksFilePath: string, error: any) {
            return reportPluginLink({
                title: "Plugin link registry could not be read.",
                summary: "Plugin link registry could not be read",
                detail: { linksFilePath },
                error,
                subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                type: "plugin-link-registry"
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
                type: "plugin-link-save"
            });
        },
        runtimeMainFactoryFailed(pluginInfo: PluginRef, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-factory-error",
                phase: "runtime-main",
                title: "Runtime main plugin factory failed.",
                summary: `${pluginInfo.name} runtime main factory failed`,
                detail: `Plugin: ${pluginInfo.name}`,
                error
            });
        },
        runtimeMainMethodFailed(pluginInfo: PluginRef, methodName: string, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-method-error",
                phase: "runtime-main",
                title: "Runtime main plugin method failed.",
                summary: `${pluginInfo.name} runtime main method failed: ${methodName}`,
                detail: `Plugin: ${pluginInfo.name}\nMethod: ${methodName}`,
                error
            });
        },
        runtimeMainDisposerFailed(pluginInfo: PluginRef, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-disposer-error",
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
                phase: "runtime-main",
                title: "Runtime main plugin load failed.",
                summary: `${pluginInfo.name} runtime main load failed`,
                detail: `Plugin: ${pluginInfo.name}`,
                error
            });
        },
        runtimeMainDisposeFailed(pluginInfo: PluginRef, error: any) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-dispose-error",
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

const PluginReportPhases = [
    "link",
    "manifest",
    "build",
    "exports",
    "import",
    "runtime",
    "hmr",
    "runtime-main"
];

export function getPluginPhasePriority(phase: string) {
    const idx = PluginReportPhases.indexOf(phase);
    return idx === -1 ? Infinity : idx;
}

export function pluginBuildErrorToSummary(error: any) {
    if (typeof error === "string") return error.split("\n")[0];
    if ("stack" in error) return stripVTControlCharacters(String(error.stack).split("\n")[0]);
    if ("loc" in error) return `at ${error.loc.file ?? error.id}:${error.loc.line}`;
    return error.message ?? null;
}
