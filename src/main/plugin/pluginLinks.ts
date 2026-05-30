import { join } from "path";
import fs from "fs/promises";
import { dataDir, pluginDir } from "../dirs";
import { getManifest, MANIFEST, normalizeManifest } from "./pluginManifest";
import { pathExists } from "../pathExists";
import type { ReportDiagnostic } from "../diagnostics";
import type { PluginType } from "./type";

export type PluginLinks = Record<string, { sourcePath: string; linked: boolean }>;

export const PLUGIN_LINK = "plugin-links.json";
const LINKS_FILE_PATH = join(dataDir, PLUGIN_LINK);

type PluginLinkServiceOptions = {
    reportDiagnostic?: ReportDiagnostic | null;
};

function getLinkSubject(id: string, type: string = "plugin-link") {
    return { id, type };
}

function createPluginLinkReporter(reportDiagnostic: ReportDiagnostic | null = null) {
    return async function reportPluginLinkIssue({
        level = "error",
        title,
        detail,
        error,
        subject,
        logType
    }: {
        level?: "warning" | "error";
        title: string;
        detail?: any;
        error?: any;
        subject?: { id?: string; type?: string };
        logType: string;
    }) {
        if (!reportDiagnostic) return;
        await reportDiagnostic({
            level,
            title,
            detail,
            error,
            source: "plugin-link",
            subject,
            logType,
            dialogue: false
        });
    };
}

export function createPluginLinkService({
    reportDiagnostic = null
}: PluginLinkServiceOptions = {}) {
    const reportPluginLinkIssue = createPluginLinkReporter(reportDiagnostic);

    let currentPluginLinks: PluginLinks;

    async function readManifest(manifestPath: string) {
        const manifestReadResult = await getManifest(manifestPath);
        if (manifestReadResult.ok === false) {
            if (!manifestReadResult.silent) {
                await reportPluginLinkIssue({
                    level: "error",
                    title: "Linked plugin manifest could not be loaded.",
                    detail: {
                        manifestPath,
                        reason: manifestReadResult.reason,
                        detail: manifestReadResult.detail
                    },
                    error: manifestReadResult.error,
                    subject: getLinkSubject(manifestPath, "plugin-source"),
                    logType: "plugin-link-manifest"
                });
            }
            return null;
        }
        return normalizeManifest(manifestReadResult.data);
    }

    async function replaceName(beforeName: string, newName: string) {
        if (newName === beforeName) return false;
        await getPluginLinks();
        if (currentPluginLinks[newName]) return false;
        const temp = currentPluginLinks[beforeName];
        if (!temp) return false;
        delete currentPluginLinks[beforeName];
        currentPluginLinks[newName] = temp;
        await updatePluginLinks();
        return true;
    }

    async function updateManifestFromSource(
        sourceDir: string,
        destDir: string,
        forceUpdate = false,
        { name, type }: { name: string | null; type: PluginType | null } = {
            name: null,
            type: null
        }
    ): Promise<{ updated: false; unlinked?: boolean } | { updated: true }> {
        const sourceManifest = join(sourceDir, MANIFEST);
        const destManifest = join(destDir, MANIFEST);
        if (!forceUpdate) {
            const should = await shouldUpdate(sourceManifest, destManifest);
            if (name && should.unlinked && name in currentPluginLinks)
                currentPluginLinks[name].linked = false;
            if (!should.update) return { updated: false, unlinked: should.unlinked };
        }
        try {
            await fs.mkdir(destDir, { recursive: true }).then(() =>
                fs.cp(sourceManifest, destManifest, {
                    preserveTimestamps: true
                })
            );
            if (name && name in currentPluginLinks) currentPluginLinks[name].linked = true;
            return { updated: true };
        } catch (err) {
            await reportPluginLinkIssue({
                level: "error",
                title: "Linked plugin manifest could not be copied.",
                detail: {
                    pluginName: name ?? "unknown",
                    sourceManifest,
                    destManifest
                },
                error: err,
                subject: getLinkSubject(name ?? "unknown", type ?? "unknown"),
                logType: "plugin-link-copy"
            });
            return { updated: false };
        }
    }

    async function addPluginLink(sourceDir: string, replace: boolean = false): Promise<boolean> {
        const current = await getPluginLinks();
        if (!current) return false;
        const manifest = await readManifest(join(sourceDir, MANIFEST));
        if (!manifest) return false;
        if (!replace && current[manifest.name]) {
            await reportPluginLinkIssue({
                level: "warning",
                title: "Plugin source is already linked.",
                detail: {
                    pluginName: manifest.name,
                    currentSourcePath: current[manifest.name].sourcePath,
                    requestedSourcePath: sourceDir
                },
                subject: getLinkSubject(manifest.name, manifest.type),
                logType: "plugin-link-duplicate"
            });
            return false;
        }
        if (
            !(
                await updateManifestFromSource(
                    sourceDir,
                    join(pluginDir, manifest.name),
                    true,
                    manifest
                )
            ).updated
        )
            return false;
        const newLinks = { ...current, [manifest.name]: { sourcePath: sourceDir, linked: true } };
        return await updatePluginLinks(newLinks);
    }

    async function unlinkPlugin(pluginName: string): Promise<boolean> {
        const current = await getPluginLinks();
        if (!current || !(pluginName in current)) return false;
        delete current[pluginName];

        return await updatePluginLinks(current);
    }

    async function getPluginLinks(): Promise<PluginLinks | null> {
        if (currentPluginLinks) return currentPluginLinks;

        if (!(await pathExists(LINKS_FILE_PATH))) return {};

        try {
            const content = await fs.readFile(LINKS_FILE_PATH, "utf8");
            const obj = JSON.parse(content);
            const links = await normalizeLinks(obj);
            if (!links) {
                await reportPluginLinkIssue({
                    level: "warning",
                    title: "Plugin link registry is invalid.",
                    detail: {
                        linksFilePath: LINKS_FILE_PATH
                    },
                    subject: getLinkSubject(LINKS_FILE_PATH, "plugin-link-registry"),
                    logType: "plugin-link-registry"
                });
                return null;
            }
            currentPluginLinks = links;
            return links;
        } catch (err) {
            await reportPluginLinkIssue({
                level: "warning",
                title: "Plugin link registry could not be read.",
                detail: {
                    linksFilePath: LINKS_FILE_PATH
                },
                error: err,
                subject: getLinkSubject(LINKS_FILE_PATH, "plugin-link-registry"),
                logType: "plugin-link-registry"
            });
            return null;
        }
    }

    async function updatePluginLinks(newLinks: PluginLinks = currentPluginLinks): Promise<boolean> {
        try {
            currentPluginLinks = newLinks;
            await fs.writeFile(
                LINKS_FILE_PATH,
                JSON.stringify(serializePluginLinks(newLinks)),
                "utf8"
            );
            return true;
        } catch (err) {
            await reportPluginLinkIssue({
                level: "error",
                title: "Plugin link registry could not be saved.",
                detail: {
                    linksFilePath: LINKS_FILE_PATH
                },
                error: err,
                subject: getLinkSubject(LINKS_FILE_PATH, "plugin-link-registry"),
                logType: "plugin-link-save"
            });
            return false;
        }
    }

    return {
        addPluginLink,
        unlinkPlugin,
        updateManifestFromSource,
        getPluginLinks,
        replaceName
    };
}

export type PluginLinkService = ReturnType<typeof createPluginLinkService>;

function serializePluginLinks(links: PluginLinks) {
    const result: Record<string, { sourcePath: string }> = {};
    for (const [name, link] of Object.entries(links)) {
        result[name] = { sourcePath: link.sourcePath };
    }
    return result;
}

const UPDATE_TIME_TOLERANCE_MS = 1000;
async function shouldUpdate(sourcePath: string, destPath: string) {
    const destStat = await fs.stat(destPath).catch(() => null);
    if (!destStat) return { update: true };
    const srcStat = await fs.stat(sourcePath).catch(() => null);
    if (!srcStat) return { unlinked: true };
    return {
        update:
            !destStat ||
            srcStat.size !== destStat.size ||
            Math.abs(srcStat.mtimeMs - destStat.mtimeMs) > UPDATE_TIME_TOLERANCE_MS
    };
}

async function normalizeLinks(
    value: Record<string, { sourcePath: string }>
): Promise<PluginLinks | null> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const links: PluginLinks = {};
    await Promise.all(
        Object.entries(value).map(async ([pluginName, link]) => {
            if (typeof link.sourcePath !== "string") return;
            links[pluginName] = {
                sourcePath: link.sourcePath,
                linked: await pathExists(join(link.sourcePath, MANIFEST))
            };
        })
    );
    return links;
}
