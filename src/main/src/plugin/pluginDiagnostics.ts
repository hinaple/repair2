import { stripVTControlCharacters } from "util";

import type { LogPayload, ReportLog } from "../logs/reportLog";
import type { LogLevel, LogSubject } from "../logs/logEntry";
import type { PluginInfo, PluginInfoData, PluginType } from "./type";
import type { LogFrom } from "@shared/log.types";
import type { RollupError } from "rollup";

type PluginReportPayload = Omit<LogPayload, "source" | "type"> & {
    level?: LogLevel;
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
        content,
        from,
        phase,
        level = "error"
    }: {
        plugin: PluginRef;
        code: string;
        phase: string;
        content: any;
        from?: LogFrom;
        level?: LogLevel;
    }) {
        return report({
            level,
            content,
            from,
            subject: pluginSubject(plugin),
            type: code,
            phase
        });
    }

    function reportPluginLink({
        content,
        subject,
        type,
        level = "warning",
        from
    }: {
        content: any;
        subject: LogSubject;
        type: string;
        level?: LogLevel;
        from?: LogFrom;
    }) {
        return report({
            level,
            content,
            source: "plugin-link",
            subject,
            type,
            phase: "link",
            from
        });
    }

    return {
        report,
        manifestInvalid({ dir, content }: { dir: string; content: any[] }) {
            return report({
                level: "warning",
                content: ["Plugin manifest is invalid: ", ...content],
                subject: { kind: "plugin", id: dir, type: "unknown" },
                type: "plugin-manifest-warning",
                phase: "manifest",
                from: { filename: dir }
            });
        },
        duplicatedName({ name, from }: { name: string; from?: LogFrom }) {
            return report({
                level: "warning",
                content: ["Duplicated plugin name:", name],
                subject: { kind: "plugin", id: name },
                type: "plugin-duplicated-name-warning",
                phase: "manifest",
                from
            });
        },
        pluginLinksWarning(content: string[]) {
            return report({
                level: "warning",
                content,
                type: "plugin-links-warning",
                phase: "link"
            });
        },
        pluginInfoMissing() {
            return report({
                level: "warning",
                content: "Old plugin info doesn't exist",
                type: "plugin-manifest-warning",
                phase: "manifest"
            });
        },
        buildFailed(
            pluginInfo: PluginRef,
            content: any[] | any = `${pluginInfo.name} Plugin build failed.`,
            phase: string = "build",
            code: string = "plugin-build-error",
            from?: LogFrom
        ) {
            return reportPlugin({
                plugin: pluginInfo,
                code,
                phase: phase,
                content,
                from
            });
        },
        runtimeError(
            pluginInfo: PluginRef,
            content: any[] | any = "Plugin runtime error occurred.",
            phase: string = "runtime",
            code: string = "plugin-runtime-error",
            from?: LogFrom
        ) {
            return reportPlugin({
                plugin: pluginInfo,
                code,
                phase: phase,
                content,
                from
            });
        },
        linkedManifestLoadFailed({
            manifestPath,
            content = []
        }: {
            manifestPath: string;
            content: any[];
        }) {
            return reportPluginLink({
                level: "error",
                content: ["Failed to load source manifest.", ...content],
                subject: { ...PLUGINS_SUBJECT, type: "plugin-source", manifestPath },
                type: "plugin-link-manifest",
                from: { filename: manifestPath }
            });
        },
        linkedManifestCopyFailed({
            pluginName,
            pluginType,
            sourceManifest,
            destManifest,
            content = []
        }: {
            pluginName: string;
            pluginType: PluginType | string;
            sourceManifest: string;
            destManifest: string;
            content: any[];
        }) {
            return reportPluginLink({
                level: "error",
                content: [
                    `Linked plugin manifest of "${pluginName}" could not be copied from ${sourceManifest} to ${destManifest}.`,
                    ...content
                ],
                from: { filename: sourceManifest },
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
                content: [
                    `Plugin source is already linked: ${pluginName}`,
                    { pluginName, currentSourcePath, requestedSourcePath }
                ],
                from: {
                    filename: requestedSourcePath
                },
                subject: pluginLinkSubject(pluginName, pluginType),
                type: "plugin-link-duplicate"
            });
        },
        linkRegistryInvalid(linksFilePath: string) {
            return reportPluginLink({
                content: "Plugin link registry is invalid.",
                from: { filename: linksFilePath },
                subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                type: "plugin-link-registry"
            });
        },
        linkRegistryReadFailed(linksFilePath: string, content: any[] = []) {
            return reportPluginLink({
                content: ["Plugin link registry could not be read.", ...content],
                from: { filename: linksFilePath },
                subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                type: "plugin-link-registry"
            });
        },
        linkRegistrySaveFailed(linksFilePath: string, content: any[] = []) {
            return reportPluginLink({
                level: "error",
                content: ["Plugin link registry could not be saved.", content],
                from: { filename: linksFilePath },
                subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                type: "plugin-link-save"
            });
        },
        runtimeMainFactoryFailed(pluginInfo: PluginRef, content: any[] = [], from?: LogFrom) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-factory-error",
                phase: "runtime-main",
                content: [`${pluginInfo.name} runtime main factory failed.`, ...content],
                from
            });
        },
        runtimeMainMethodFailed(
            pluginInfo: PluginRef,
            methodName: string,
            content: any[] = [],
            from?: LogFrom
        ) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-method-error",
                phase: "runtime-main",
                content: [
                    `${pluginInfo.name} runtime main method failed: ${methodName}`,
                    ...content
                ],
                from
            });
        },
        runtimeMainDisposerFailed(pluginInfo: PluginRef, content: any[] = [], from?: LogFrom) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-disposer-error",
                phase: "runtime-main",
                content: [`${pluginInfo.name} runtime main disposer failed.`, ...content],
                from
            });
        },
        runtimeMainLoadFailed(pluginInfo: PluginRef, content: any[] = [], from?: LogFrom) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-load-error",
                phase: "runtime-main",
                content: [`${pluginInfo.name} runtime main load failed`, ...content],
                from
            });
        },
        runtimeMainDisposeFailed(pluginInfo: PluginRef, content: any[] = [], from?: LogFrom) {
            return reportPlugin({
                plugin: pluginInfo,
                code: "plugin-runtime-main-dispose-error",
                phase: "runtime-main",
                content: [`${pluginInfo.name} runtime main dispose failed`, ...content],
                from
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

export function pluginBuildErrorToSummary(error: RollupError | string) {
    if (typeof error === "string") return error.split("\n")[0];
    if ("stack" in error) return stripVTControlCharacters(String(error.stack).split("\n")[0]);
    if ("loc" in error && error.loc) return `at ${error.loc.file ?? error.id}:${error.loc.line}`;
    return error.message ?? null;
}

export function pluginErrorToFrom(plugin: PluginInfoData, error: RollupError): LogFrom {
    return {
        filename: error.loc?.file ?? error.id ?? plugin.info.path,
        lineNumber: error.loc?.line,
        columnNumber: error.loc?.column
    };
}
