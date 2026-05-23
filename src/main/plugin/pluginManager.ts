import fs from "fs/promises";
import { join } from "path";
import { PLUGIN_TYPES, PluginType, RawManifest, PluginInfo } from "./type";
import { buildPlugin } from "./pluginBuild";
import { getManifest, normalizeManifest } from "./pluginManifest";
import MainRuntimePluginEngine from "./runtimeMain";
import type { ReportDiagnostic } from "../diagnostics";
import { pluginDir } from "../dirs";
import { createPluginLinkService, PluginLinks, PluginLinkService } from "./pluginLinks";

type PluginData = {
    building?: Promise<any> | null;
    ready?: boolean;
};

export class PluginManager {
    private _isDev: boolean;
    private updated: boolean;
    private reportDiagnostic?: ReportDiagnostic;

    pluginLinkService: PluginLinkService;
    mainRuntime: MainRuntimePluginEngine;

    plugins: Map<string, { info: PluginInfo; data: PluginData }>;
    constructor({
        isDev = false,
        reportDiagnostic = null
    }: {
        isDev: boolean;
        reportDiagnostic?: ReportDiagnostic | null;
    }) {
        this.plugins = new Map();
        this._isDev = isDev;
        this.updated = false;
        this.reportDiagnostic = reportDiagnostic ?? undefined;
        this.pluginLinkService = createPluginLinkService({ reportDiagnostic });
        this.mainRuntime = new MainRuntimePluginEngine({ pluginDir, reportDiagnostic });
    }
    async initialize() {
        if (this.updated) return;

        await this.ensureDirectories();
        await this.pluginLinkService.getPluginLinks();
        await this.updateAllPluginInfo();
        console.log("PLUGINS: ", [...this.plugins.keys()].join(", "));
    }
    set isDev(isDev: boolean) {
        this._isDev = isDev;
    }
    async updateAllPluginInfo(forceBuild = false) {
        this.updated = false;
        this.plugins.clear();
        await Promise.all(
            (await this.getPluginDirList()).map((dir) => this.updatePlugin(dir, forceBuild))
        );
        this.updated = true;
    }
    async updatePlugin(dir: string, forceBuild = false) {
        let p: { info: PluginInfo; data: PluginData } | null = null;
        try {
            p = await this.updatePluginInfo(dir);
            if (!p) return;
            await this.ready(p.info.name, forceBuild);

            if (p.info.type === "runtime" && p.info.main)
                this.mainRuntime.updatePlugin(p.info, true);
        } catch (err) {
            if (p) this.plugins.delete(p.info.name);
            await this.reportDiagnostic?.({
                level: "error",
                title: "Plugin update failed.",
                detail: `Plugin directory: ${dir}`,
                error: err,
                source: "plugin",
                subject: p ? { id: p.info.name, type: p.info.type } : { id: dir, type: "unknown" },
                dialogue: false,
                logType: "plugin-update-error"
            });
        }
    }
    private ensureDirectories() {
        return fs.access(pluginDir).catch(() => fs.mkdir(pluginDir));
    }
    private async getPluginDirList() {
        const dirs: string[] = (await fs.readdir(pluginDir, { withFileTypes: true })).reduce(
            (dirs: string[], dirent) => {
                if (dirent.isDirectory()) dirs.push(dirent.name);
                return dirs;
            },
            []
        );
        return dirs;
    }
    async updatePluginInfo(dir: string) {
        const manifestResult = await getManifest(pluginDir, dir);
        if (manifestResult.ok === false) {
            if (!manifestResult.silent) {
                await this.reportDiagnostic?.({
                    level: "warning",
                    title: "Plugin manifest is invalid.",
                    detail: manifestResult.detail ?? `Plugin directory: ${dir}`,
                    error: manifestResult.error,
                    source: "plugin",
                    subject: { id: dir, type: "unknown", reason: manifestResult.reason },
                    dialogue: false,
                    logType: "plugin-manifest-warning"
                });
            }
            return null;
        }

        const rawManifest: RawManifest = manifestResult.data;
        const manifest = normalizeManifest(rawManifest);
        if (this.plugins.has(manifest.name)) {
            const duplicatedPlugin = this.plugins.get(manifest.name);
            await this.reportDiagnostic?.({
                level: "warning",
                title: "Duplicated plugin name.",
                detail: [
                    `Plugin name: ${manifest.name}`,
                    `Ignored directory: ${dir}`,
                    duplicatedPlugin?.info.path
                        ? `Already registered directory: ${duplicatedPlugin.info.path}`
                        : null
                ]
                    .filter(Boolean)
                    .join("\n"),
                source: "plugin",
                subject: { id: manifest.name, type: manifest.type },
                dialogue: false,
                logType: "plugin-duplicated-name-warning"
            });
            return null;
        }

        const sourceDir = this.pluginLinkService.getCachedPluginLinks()[manifest.name]?.sourcePath;
        const plugin: { info: PluginInfo; data: PluginData } = {
            info: {
                path: sourceDir ?? dir,
                distFile: join(dir, manifest.outDir, "index.js"),
                ...(manifest.main
                    ? { mainDistFile: join(dir, manifest.main.outDir, "index.cjs") }
                    : null),
                ...(sourceDir ? { linked: { sourcePath: sourceDir } } : null),
                ...manifest
            },
            data: {}
        };
        this.plugins.set(manifest.name, plugin);
        return plugin;
    }
    async ready(pluginName: string, forceBuild = false) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return;

        const { info, data } = plugin;
        if (data.building) return await data.building;

        if (data.ready || (!(this._isDev || forceBuild) && (await this.isBuilt(info)))) return;
        return await this.buildPlugin(pluginName);
    }
    private async isBuilt(pluginInfo: PluginInfo) {
        const files = [pluginInfo.distFile, pluginInfo.mainDistFile].filter(Boolean);
        return Promise.all(files.map((file) => fs.access(join(pluginDir, file as string))))
            .then(() => true)
            .catch(() => false);
    }
    async buildPlugin(pluginName: string): Promise<any> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return;
        const { info, data } = plugin;
        if (!data.building) {
            console.log("PLUGIN BUILDING: ", pluginName);
            data.building = buildPlugin(info, {
                pluginPath: info.linked ? info.linked.sourcePath : join(pluginDir, info.path)
            })
                .then((result) => {
                    data.ready = true;
                    console.log("PLUGIN BUILT: ", pluginName);
                    return result;
                })
                .finally(() => {
                    data.building = null;
                });
        }
        return await data.building;
    }
    get pluginListWithTypes() {
        if (!this.updated) return {};
        const result: Record<PluginType | string, Record<string, PluginInfo>> = Object.fromEntries(
            PLUGIN_TYPES.map((t) => [t, {}])
        );
        this.plugins.forEach(({ info }, pluginName) => {
            result[info.type][pluginName] = info;
        });
        return result;
    }
    get simplePluginList() {
        if (!this.updated) return {};
        const result: Record<string, PluginInfo> = {};
        this.plugins.forEach(({ info }, pluginName) => {
            result[pluginName] = info;
        });
        return result;
    }
}
