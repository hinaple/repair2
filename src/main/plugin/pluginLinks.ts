import { join } from "path";
import fs from "fs/promises";
import { dataDir, pluginDir } from "../dirs";
import type { ReportDiagnostic } from "../diagnostics";
import { getManifest, MANIFEST, normalizeManifest } from "./pluginManifest";
import { PluginManifest } from "./type";

export type PluginLinks = Record<string, { sourcePath: string }>;

const LINKS_FILE_PATH = join(dataDir, "plugin-links.json");

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

    let currentPluginLinks: PluginLinks = {};

    async function readManifest(sourceDir: string) {
        const manifestReadResult = await getManifest(sourceDir);
        if (manifestReadResult.ok === false) {
            if (!manifestReadResult.silent) {
                await reportPluginLinkIssue({
                    level: "error",
                    title: "Linked plugin manifest could not be loaded.",
                    detail: {
                        sourceDir,
                        reason: manifestReadResult.reason,
                        detail: manifestReadResult.detail
                    },
                    error: manifestReadResult.error,
                    subject: getLinkSubject(sourceDir, "plugin-source"),
                    logType: "plugin-link-manifest"
                });
            }
            return null;
        }
        return normalizeManifest(manifestReadResult.data);
    }

    async function updateManifestFromSource(sourceDir: string, manifest?: PluginManifest | null) {
        if (!manifest) manifest = await readManifest(sourceDir);
        if (!manifest) return false;
        const targetDir = join(pluginDir, manifest.name);
        try {
            await fs.mkdir(targetDir, { recursive: true });
            await fs.copyFile(join(sourceDir, MANIFEST), join(targetDir, MANIFEST));
            return true;
        } catch (err) {
            await reportPluginLinkIssue({
                level: "error",
                title: "Linked plugin manifest could not be copied.",
                detail: {
                    pluginName: manifest.name,
                    sourceManifest: join(sourceDir, MANIFEST),
                    targetManifest: join(targetDir, MANIFEST)
                },
                error: err,
                subject: getLinkSubject(manifest.name, manifest.type),
                logType: "plugin-link-copy"
            });
            return false;
        }
    }

    async function addPluginLink(sourceDir: string, replace: boolean = false): Promise<boolean> {
        const current = await getPluginLinks();
        if (!current) return false;
        const manifest = await readManifest(sourceDir);
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
        if (!(await updateManifestFromSource(sourceDir, manifest))) return false;
        const newLinks = { ...current, [manifest.name]: { sourcePath: sourceDir } };
        return await updatePluginLinks(newLinks);
    }

    async function unlinkPlugin(pluginName: string): Promise<boolean> {
        const current = await getPluginLinks();
        if (!current || !(pluginName in current)) return false;
        delete current[pluginName];

        return await updatePluginLinks(current);
    }

    async function getPluginLinks(): Promise<PluginLinks | null> {
        if (!(await doesLinksFileExist())) return {};

        try {
            const content = await fs.readFile(LINKS_FILE_PATH, "utf8");
            const obj = JSON.parse(content);
            const links = normalizeLinks(obj);
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

    async function updatePluginLinks(newLinks: PluginLinks): Promise<boolean> {
        try {
            await fs.writeFile(LINKS_FILE_PATH, JSON.stringify(newLinks, null, 4), "utf8");
            currentPluginLinks = newLinks;
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

    function getCachedPluginLinks() {
        return currentPluginLinks;
    }

    return {
        addPluginLink,
        unlinkPlugin,
        getPluginLinks,
        updatePluginLinks,
        getCachedPluginLinks
    };
}

export type PluginLinkService = ReturnType<typeof createPluginLinkService>;

function normalizeLinks(value: any): PluginLinks | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const links: PluginLinks = {};
    for (const [pluginName, link] of Object.entries(value)) {
        if (!link || typeof link !== "object" || typeof (link as any).sourcePath !== "string")
            return null;
        links[pluginName] = { sourcePath: (link as any).sourcePath };
    }
    return links;
}

function doesLinksFileExist() {
    return fs
        .access(LINKS_FILE_PATH)
        .then(() => true)
        .catch(() => false);
}
