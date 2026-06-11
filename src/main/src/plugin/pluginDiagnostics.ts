import { stripVTControlCharacters } from "util";

import type { LogSubject } from "../logs/logEntry";
import type { PluginInfo, PluginInfoData, PluginType } from "./type";
import type { LogFrom } from "@shared/log.types";
import type { RollupError } from "rollup";
import { logger } from "../logs/logger";

type PluginRef = Pick<PluginInfo, "name" | "type">;

const PLUGINS_SUBJECT = { kind: "project", id: "plugins" };

function pluginSubject(plugin: PluginRef): LogSubject {
    return { kind: "plugin", id: plugin.name, type: plugin.type };
}

function pluginLinkSubject(pluginName: string, pluginType: PluginType | string): LogSubject {
    if (!pluginName || pluginName === "unknown") return { ...PLUGINS_SUBJECT, type: "plugin-link" };
    return { kind: "plugin", id: pluginName, type: pluginType };
}

export function createPluginDiagnostics() {
    function pluginLogger(plugin: PluginRef) {
        return logger.with({
            subject: pluginSubject(plugin)
        });
    }

    return {
        manifestInvalid({ dir, content }: { dir: string; content: any[] }) {
            return logger
                .with({
                    subject: { kind: "plugin", id: dir, type: "unknown" },
                    type: "plugin-manifest-warning",
                    phase: "manifest",
                    from: { filename: dir }
                })
                .warning("Plugin manifest is invalid: ", ...content);
        },
        duplicatedName({ name, from }: { name: string; from?: LogFrom }) {
            return logger
                .with({
                    subject: { kind: "plugin", id: name },
                    type: "plugin-duplicated-name-warning",
                    phase: "manifest",
                    from
                })
                .warning("Duplicated plugin name:", name);
        },
        pluginLinksWarning(content: string[]) {
            return logger.with({ type: "plugin-links-warning", phase: "link" }).warning(...content);
        },
        pluginInfoMissing() {
            return logger
                .with({ type: "plugin-manifest-warning", phase: "manifest" })
                .warning("Old plugin info doesn't exist");
        },
        buildFailed(
            pluginInfo: PluginRef,
            content: any[] = [`${pluginInfo.name} Plugin build failed.`],
            phase: string = "build",
            type: string = "plugin-build-error",
            from?: LogFrom
        ) {
            return pluginLogger(pluginInfo)
                .with({ phase, type, from })
                .error(...content);
        },
        runtimeError(
            pluginInfo: PluginRef,
            content: any[] = ["Plugin runtime error occurred."],
            phase: string = "runtime",
            type: string = "plugin-runtime-error",
            from?: LogFrom
        ) {
            return pluginLogger(pluginInfo)
                .with({ type, phase, from })
                .error(...content);
        },
        linkedManifestLoadFailed({
            manifestPath,
            content = []
        }: {
            manifestPath: string;
            content: any[];
        }) {
            return logger
                .with({
                    subject: { ...PLUGINS_SUBJECT, type: "plugin-source", manifestPath },
                    type: "plugin-link-manifest",
                    from: { filename: manifestPath }
                })
                .error("Failed to load source manifest.", ...content);
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
            return logger
                .with({
                    subject: pluginLinkSubject(pluginName, pluginType),
                    type: "plugin-link-copy",
                    phase: "link",
                    from: { filename: sourceManifest }
                })
                .error(
                    `Linked plugin manifest of "${pluginName}" could not be copied from ${sourceManifest} to ${destManifest}.`,
                    ...content
                );
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
            return logger
                .with({
                    subject: pluginLinkSubject(pluginName, pluginType),
                    type: "plugin-link-duplicate",
                    phase: "link",
                    from: {
                        filename: requestedSourcePath
                    }
                })
                .warning("Plugin source is already linked:", pluginName, {
                    pluginName,
                    currentSourcePath,
                    requestedSourcePath
                });
        },
        linkRegistryInvalid(linksFilePath: string) {
            return logger
                .with({
                    subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                    type: "plugin-link-registry",
                    phase: "link",
                    from: { filename: linksFilePath }
                })
                .warning("Plugin link registry is invalid.");
        },
        linkRegistryReadFailed(linksFilePath: string, content: any[] = []) {
            return logger
                .with({
                    subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                    type: "plugin-link-registry",
                    phase: "link",
                    from: { filename: linksFilePath }
                })
                .warning("Plugin link registry could not be read.", ...content);
        },
        linkRegistrySaveFailed(linksFilePath: string, content: any[] = []) {
            return logger
                .with({
                    subject: { ...PLUGINS_SUBJECT, type: "plugin-link-registry" },
                    type: "plugin-link-save",
                    phase: "link",
                    from: { filename: linksFilePath }
                })
                .error("Plugin link registry could not be saved.", ...content);
        },
        runtimeMainFactoryFailed(pluginInfo: PluginRef, content: any[] | any = [], from?: LogFrom) {
            return pluginLogger(pluginInfo)
                .with({
                    type: "plugin-runtime-main-factory-error",
                    phase: "runtime-main",
                    from
                })
                .error(
                    `${pluginInfo.name} runtime main factory failed.`,
                    ...(Array.isArray(content) ? content : [content])
                );
        },
        runtimeMainMethodFailed(
            pluginInfo: PluginRef,
            methodName: string,
            content: any[] | any = [],
            from?: LogFrom
        ) {
            return pluginLogger(pluginInfo)
                .with({
                    type: "plugin-runtime-main-method-error",
                    phase: "runtime-main",
                    from
                })
                .error(
                    `${pluginInfo.name} runtime main method failed: ${methodName}`,
                    ...(Array.isArray(content) ? content : [content])
                );
        },
        runtimeMainDisposerFailed(pluginInfo: PluginRef, content: any[] | any = [], from?: LogFrom) {
            return pluginLogger(pluginInfo)
                .with({
                    type: "plugin-runtime-main-disposer-error",
                    phase: "runtime-main",
                    from
                })
                .error(
                    `${pluginInfo.name} runtime main disposer failed.`,
                    ...(Array.isArray(content) ? content : [content])
                );
        },
        runtimeMainLoadFailed(pluginInfo: PluginRef, content: any[] | any = [], from?: LogFrom) {
            return pluginLogger(pluginInfo)
                .with({
                    type: "plugin-runtime-main-load-error",
                    phase: "runtime-main",
                    from
                })
                .error(
                    `${pluginInfo.name} runtime main load failed`,
                    ...(Array.isArray(content) ? content : [content])
                );
        },
        runtimeMainDisposeFailed(pluginInfo: PluginRef, content: any[] | any = [], from?: LogFrom) {
            return pluginLogger(pluginInfo)
                .with({
                    type: "plugin-runtime-main-dispose-error",
                    phase: "runtime-main",
                    from
                })
                .error(
                    `${pluginInfo.name} runtime main dispose failed`,
                    ...(Array.isArray(content) ? content : [content])
                );
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
