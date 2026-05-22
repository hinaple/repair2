import fs from "fs/promises";
import { join } from "path";
import { PLUGIN_TYPES, PluginType, PluginManifest, RawManifest, PluginInfo } from "./type";
import { buildPlugin } from "./pluginBuild";
import { getManifest, normalizeManifest } from "./pluginManifest";
import MainRuntimePluginEngine from "./runtimeMain";

type PluginData = {
    building?: Promise<any> | null;
    ready?: boolean;
};

export class PluginManager {
    private pluginDir: string;
    private _isDev: boolean;
    private updated: boolean;

    mainRuntime: MainRuntimePluginEngine;

    plugins: Map<string, { info: PluginInfo; data: PluginData }>;
    constructor({ pluginDir, isDev = false }: { pluginDir: string; isDev: boolean }) {
        this.pluginDir = pluginDir;
        this.plugins = new Map();
        this._isDev = isDev;
        this.updated = false;
        this.mainRuntime = new MainRuntimePluginEngine({ pluginDir });
    }
    async initialize() {
        if (this.updated) return;

        await this.ensureDirectories();
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
            console.error(`PLUGIN UPDATE FAILED: ${dir}`, err);
        }
    }
    private ensureDirectories() {
        return fs.access(this.pluginDir).catch(() => fs.mkdir(this.pluginDir));
    }
    private async getPluginDirList() {
        const dirs: string[] = (await fs.readdir(this.pluginDir, { withFileTypes: true })).reduce(
            (dirs: string[], dirent) => {
                if (dirent.isDirectory()) dirs.push(dirent.name);
                return dirs;
            },
            []
        );
        return dirs;
    }
    async updatePluginInfo(dir: string) {
        const rawManifest: RawManifest = await getManifest(this.pluginDir, dir);
        if (!rawManifest) return null;
        const manifest = normalizeManifest(rawManifest);
        const plugin: { info: PluginInfo; data: PluginData } = {
            info: {
                path: dir,
                distFile: join(dir, manifest.outDir, "index.js"),
                ...manifest
            },
            data: {}
        };
        if (manifest.main) {
            plugin.info.mainDistFile = join(dir, manifest.main.outDir, "index.cjs");
        }
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
        return Promise.all(files.map((file) => fs.access(join(this.pluginDir, file as string))))
            .then(() => true)
            .catch(() => false);
    }
    async buildPlugin(pluginName: string): Promise<any> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return;
        const { info, data } = plugin;
        if (!data.building) {
            console.log("PLUGIN BUILDING: ", pluginName);
            data.building = buildPlugin(info, { pluginDir: this.pluginDir })
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
