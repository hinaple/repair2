import fs from "fs/promises";
import { join } from "path";
import { build } from "vite";

const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"] as const;
const MANIFEST = "manifest.json";
type PluginType = (typeof PLUGIN_TYPES)[number];

type PluginManifest = {
    name: string;
    type: PluginType;
    main: string;
    outDir: string;
    attributes: string[];
    steps?: Record<string, null | string[]>;
};
type PluginInfo = PluginManifest & {
    path: string;
    distFile: string;
};

type PluginData = {
    building?: Promise<any> | null;
    ready?: boolean;
};

export class PluginManager {
    private pluginDir: string;
    private _isDev: boolean;
    private updated: boolean;

    plugins: Map<string, { info: PluginInfo; data: PluginData }>;
    constructor({ pluginDir, isDev = false }: { pluginDir: string; isDev: boolean }) {
        this.pluginDir = pluginDir;
        this.plugins = new Map();
        this._isDev = isDev;
        this.updated = false;
    }
    async initialize() {
        if (this.updated) return;

        await this.ensureDirectories();
        await this.updateAllPluginInfo();
    }
    set isDev(isDev: boolean) {
        this._isDev = isDev;
    }
    async updateAllPluginInfo() {
        this.updated = false;
        this.plugins.clear();
        await Promise.all((await this.getPluginDirList()).map((dir) => this.updatePluginInfo(dir)));
        this.updated = true;
    }
    private ensureDirectories() {
        return fs.access(this.pluginDir).catch(() => fs.mkdir(this.pluginDir));
    }
    private async getPluginDirList() {
        const dirs: string[] = (await fs.readdir(this.pluginDir, { withFileTypes: true })).reduce(
            (dirs: string[], dirent) => {
                if (dirent.isDirectory()) dirs.push(join(dirent.parentPath, dirent.name));
                return dirs;
            },
            []
        );
        return dirs;
    }
    async updatePluginInfo(dir: string) {
        const manifest = this.normalizeManifest(await this.getManifest(dir));

        this.plugins.set(manifest.name, {
            info: {
                path: dir,
                distFile: join(dir, manifest.outDir, "index.js"),
                ...manifest
            },
            data: {}
        });
    }
    private normalizeManifest(mani: {
        name: string;
        type: PluginType;
        main?: string;
        outDir?: string;
        attributes?: string[];
        attr?: string[];
        steps?: string[] | Record<string, string[] | null>;
    }): PluginManifest {
        const { name, type, main = "src/index.js", outDir = "dist" } = mani;
        const result: any = { name, type: type, main, outDir };
        result.attributes = mani.attributes ?? mani.attr ?? [];
        if (type === "runtime") {
            let steps = mani.steps ?? {};
            if (Array.isArray(steps)) steps = Object.fromEntries(steps.map((s) => [s, null]));
            result.steps = steps;
        }
        return result;
    }
    private async getManifest(dir: string) {
        try {
            const result = (await fs.readFile(join(dir, MANIFEST), "utf8")).toString();
            if (!result) return false;
            const data = JSON.parse(result);
            return (
                !!(data && data.name && data.type && PLUGIN_TYPES.some((t) => t === data.type)) &&
                data
            );
        } catch {
            return false;
        }
    }
    async ready(pluginName: string) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return;

        const { info, data } = plugin;
        if (data.building) return await data.building;

        if (data.ready || (!this._isDev && (await this.isBuilt(info)))) return;
        return await this.buildPlugin(pluginName);
    }
    private isBuilt(pluginInfo: PluginInfo) {
        return fs
            .access(pluginInfo.distFile)
            .then(() => true)
            .catch(() => false);
    }
    async buildPlugin(pluginName: string): Promise<any> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return;
        const { info, data } = plugin;
        if (!data.building) {
            data.building = build({
                configFile: false,
                build: {
                    lib: {
                        entry: info.main,
                        formats: ["es"],
                        fileName: () => "index.js"
                    },
                    rollupOptions: {
                        output: {
                            inlineDynamicImports: true
                        }
                    },
                    outDir: info.outDir,
                    cssCodeSplit: true,
                    emptyOutDir: true,
                    assetsInlineLimit: Infinity
                }
            }).then((result) => {
                data.building = null;
                data.ready = true;
                return result;
            });
        }
        return await data.building;
    }
    get simplePluginList() {
        if (!this.updated) return {};
        const result: Record<PluginType | string, Record<string, PluginInfo>> = Object.fromEntries(
            PLUGIN_TYPES.map((t) => [t, {}])
        );
        this.plugins.forEach(({ info }, pluginName) => {
            result[info.type][pluginName] = info;
        });
        return result;
    }
}
