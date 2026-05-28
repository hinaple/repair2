import fs from "fs/promises";
import { join } from "path";
import { RawManifest, PluginInfo, PluginManifest, PluginType } from "./type";
import { buildPlugin } from "./pluginBuild";
import { getManifest, normalizeManifest } from "./pluginManifest";
import MainRuntimePluginEngine from "./runtimeMain";
import type { ReportDiagnostic } from "../diagnostics";
import { pluginDir } from "../dirs";
import { createPluginLinkService, PluginLinkService } from "./pluginLinks";
import type { RollupWatcher } from "rollup";
import { pathExists } from "../pathExists";

type PluginData = {
    building?: Promise<any> | null;
    ready?: boolean;
    watchers?: RollupWatcher[];
    error?: any;
};

type UpdateHandlerParams =
    | {
          type: "single";
          updateData: {
              info: InfoForRenderer;
              previous: { name: string; type: PluginType } | null;
              buildChanged: boolean;
          };
      }
    | {
          type: "all";
          updateData: { buildChanges: string[] };
      };
type UpdateHandler = (updateInfo: UpdateHandlerParams) => void;
type HmrHanlder = (pluginInfo: PluginInfo, error?: any) => void;

function closeWatchers(watchers: RollupWatcher[] | undefined) {
    if (watchers?.length) return Promise.all(watchers.splice(0).map((w) => w.close()));
}

type InfoForRenderer = PluginInfo & { ready: boolean; error?: any };

function makeInfoForRenderer({
    info,
    data
}: {
    info: PluginInfo;
    data: PluginData;
}): InfoForRenderer {
    return { ...info, ready: !!data.ready, error: data.error };
}

export class PluginManager {
    private _isDev: boolean;
    private updated: boolean;
    private reportDiagnostic?: ReportDiagnostic;
    private _onupdate?: UpdateHandler;
    private _onhmr?: HmrHanlder;

    private destroyed: boolean = false;

    pluginLinkService: PluginLinkService;
    mainRuntime: MainRuntimePluginEngine;

    plugins: Map<string, { info: PluginInfo; data: PluginData }>;
    constructor({
        isDev = false,
        reportDiagnostic = null,
        onupdate,
        onhmr
    }: {
        isDev: boolean;
        reportDiagnostic?: ReportDiagnostic | null;
        onupdate?: UpdateHandler;
        onhmr?: HmrHanlder;
    }) {
        if (onupdate) this.onupdate(onupdate);
        if (onhmr) this.onhmr(onhmr);
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
        await this.updateAllPluginInfo(this._isDev);
        if (this.plugins.size > 0) console.log("PLUGINS: ", [...this.plugins.keys()].join(", "));
    }
    onupdate(updateHandler: UpdateHandler) {
        this._onupdate = updateHandler;
    }
    onhmr(hmrHandler: HmrHanlder) {
        this._onhmr = hmrHandler;
    }
    private callOnUpdate(onupdateParam: UpdateHandlerParams) {
        if (this.destroyed || !this._onupdate) return;
        return this._onupdate(onupdateParam);
    }
    private callOnHmr(pluginInfo: PluginInfo, error?: any) {
        if (this.destroyed || !this._onhmr) return;
        return this._onhmr(pluginInfo, error);
    }
    set isDev(isDev: boolean) {
        if (isDev === this._isDev) return;

        this._isDev = isDev;
        if (this._isDev) this.updateAllPluginInfo(true);
        else this.closeAllWatchers();
    }
    closeAllWatchers() {
        return Promise.all(
            Array.from(this.plugins.values(), ({ data: { watchers } }) => closeWatchers(watchers))
        );
    }
    async updateAllPluginInfo(forceBuild = false) {
        this.updated = false;
        await this.closeAllWatchers();
        this.plugins.clear();
        await this.pluginLinkService.getPluginLinks();
        const updatesResult = await Promise.all(
            (await this.getPluginDirList()).map((dir) => this.updatePlugin(dir, forceBuild, true))
        );
        this.updated = true;
        this.callOnUpdate({
            type: "all",
            updateData: {
                buildChanges: updatesResult
                    .map((r) => (r && r.builtNow ? r.name : null))
                    .filter((s) => s) as string[]
            }
        });
    }
    async updatePlugin(
        dir: string,
        forceBuild = false,
        allBuilding = false
    ): Promise<{ name: string; builtNow: boolean } | null> {
        let p: { info: PluginInfo; data: PluginData } | null = null;
        let updateInfoResult;
        let readyResult;
        try {
            updateInfoResult = await this.updatePluginInfo(dir, !allBuilding);
            if (!updateInfoResult) return null;
            p = updateInfoResult?.plugin;
            readyResult = await this.ready(p.info.name, forceBuild, this._isDev);

            if (this.destroyed) return null;

            if (updateInfoResult.previous?.type === "runtime")
                this.mainRuntime.disposeInstance(updateInfoResult.previous.name);

            if (p.info.type === "runtime" && p.info.main)
                await this.mainRuntime.updatePlugin(p.info, readyResult.builtNow);
            else if (p.info.type === "runtime") this.mainRuntime.disposeInstance(p.info.name);

            if (!allBuilding)
                this.callOnUpdate({
                    type: "single",
                    updateData: {
                        info: makeInfoForRenderer(p),
                        previous: updateInfoResult.previous,
                        buildChanged: readyResult.builtNow
                    }
                });

            return { name: p.info.name, builtNow: readyResult.builtNow };
        } catch (err) {
            if (p) {
                p.data.error = err;
                this.callOnUpdate({
                    type: "single",
                    updateData: {
                        info: makeInfoForRenderer(p),
                        previous: updateInfoResult?.previous ?? null,
                        buildChanged: readyResult?.builtNow ?? false
                    }
                });
            }
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
            return null;
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
    private async updatePluginInfo(dir: string, checkDuplicatedPath = false) {
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
        let already: {
            info: PluginInfo;
            data: PluginData;
        } | null = null;

        const alreadyResult = await this.processDuplicated(dir, manifest, checkDuplicatedPath);
        if (alreadyResult.error) return null;
        already = alreadyResult.already ?? null;

        const linkedInfo = this.pluginLinkService.getCachedPluginLinks()[manifest.name];
        const plugin: { info: PluginInfo; data: PluginData } = {
            info: {
                dir,
                path: join(pluginDir, dir),
                distFile: join(dir, manifest.outDir, "index.js"),
                ...(manifest.main
                    ? { mainDistFile: join(dir, manifest.main.outDir, "index.cjs") }
                    : null),
                ...(linkedInfo ? { linked: { ...linkedInfo } } : null),
                ...manifest
            },
            data: already?.data ?? {}
        };
        this.plugins.set(manifest.name, plugin);
        return {
            plugin,
            previous:
                already &&
                (manifest.type !== already.info.type || manifest.name !== already?.info.name)
                    ? { type: already.info.type, name: already.info.name }
                    : null
        };
    }
    private async processDuplicated(
        dir: string,
        manifest: PluginManifest,
        checkDuplicatedPath: boolean
    ): Promise<{ already?: { info: PluginInfo; data: PluginData }; error?: boolean }> {
        const alreadyExists = checkDuplicatedPath
            ? [...this.plugins.values()].find(({ info }) => info.dir === dir)
            : undefined;
        if (alreadyExists && alreadyExists?.info.name === manifest.name)
            return { already: alreadyExists };
        else if (alreadyExists) this.plugins.delete(alreadyExists.info.name); // When plugin name Changed

        const duplicated = this.plugins.get(manifest.name);
        if (!duplicated) return { already: alreadyExists };

        if (await pathExists(duplicated.info.path)) {
            await this.reportDiagnostic?.({
                level: "warning",
                title: "Duplicated plugin name.",
                detail: [
                    `Plugin name: ${manifest.name}`,
                    `Ignored directory: ${dir}`,
                    duplicated?.info.path
                        ? `Already registered directory: ${duplicated.info.path}`
                        : null
                ]
                    .filter(Boolean)
                    .join("\n"),
                source: "plugin",
                subject: { id: manifest.name, type: manifest.type },
                dialogue: false,
                logType: "plugin-duplicated-name-warning"
            });
            if (alreadyExists) closeWatchers(alreadyExists.data.watchers);
            return { error: true };
        }

        if (alreadyExists) {
            closeWatchers(duplicated.data.watchers);
            this.plugins.delete(duplicated.info.name);
            return { already: alreadyExists };
        }
        return { already: duplicated }; // When directory name changed
    }
    private async ready(pluginName: string, forceBuild = false, watch = this._isDev) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return { builtNow: false };

        const { info, data } = plugin;
        if (data.building) {
            await data.building;
            return { builtNow: false };
        }

        if (info.linked && !info.linked.linked) {
            data.ready = (!forceBuild && data.ready) || (await this.isBuilt(info));
            return { builtNow: false };
        }
        if (!forceBuild && (data.ready || (await this.isBuilt(info)))) {
            data.ready = true;
            return { builtNow: false };
        }
        data.ready = false;
        await this.buildPlugin(pluginName, watch);
        return { builtNow: true };
    }
    private async isBuilt(pluginInfo: PluginInfo) {
        const files = [pluginInfo.distFile, pluginInfo.mainDistFile].filter(Boolean);
        return Promise.all(files.map((file) => fs.access(join(pluginDir, file as string))))
            .then(() => true)
            .catch(() => false);
    }
    private async buildPlugin(pluginName: string, watch = this._isDev): Promise<any> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return;
        const { info, data } = plugin;
        await closeWatchers(data.watchers);
        if (!data.building) {
            console.log("PLUGIN BUILDING: ", pluginName);
            data.building = buildPlugin(info, {
                pluginPath: info.linked ? info.linked.sourcePath : info.path,
                watch
            })
                .then(async (result) => {
                    if (this.destroyed) {
                        if (watch) (result as RollupWatcher[]).forEach((w) => w.close());
                        return;
                    }

                    if (watch) {
                        data.watchers = result as RollupWatcher[];
                        await this.registerWatchers(info, data);
                    }
                    data.ready = true;
                    data.error = null;
                    console.log("PLUGIN BUILT: ", pluginName);
                    return result;
                })
                .catch(async (err) => {
                    data.ready = false;
                    data.error = err;
                    await this.reportDiagnostic?.({
                        level: "error",
                        title: "Plugin build failed.",
                        detail: `Plugin: ${pluginName}`,
                        error: err,
                        source: "plugin",
                        subject: { id: info.name, type: info.type },
                        dialogue: false,
                        logType: "plugin-build-error"
                    });
                    return null;
                })
                .finally((result = { failed: true }) => {
                    data.building = null;
                    return result;
                });
        }
        return await data.building;
    }
    private registerWatchers(pluginInfo: PluginInfo, data: PluginData) {
        return Promise.all(
            data.watchers?.map(
                (w, i) =>
                    new Promise((res) => {
                        let resolved = false;
                        const tryResolve = (v = true) => {
                            if (resolved) return false;
                            res(v);
                            resolved = true;
                            return true;
                        };
                        w.on("event", async (evt) => {
                            if (evt.code === "ERROR") {
                                data.error = evt.error;
                                this.reportDiagnostic?.({
                                    level: "error",
                                    title: "Plugin build failed.",
                                    detail: `Plugin: ${pluginInfo.name}`,
                                    error: evt.error,
                                    source: "plugin",
                                    subject: { id: pluginInfo.name, type: pluginInfo.type },
                                    dialogue: false,
                                    logType: "plugin-build-error"
                                });
                            }
                            if (evt.code !== "END" || tryResolve()) return;

                            data.error = null;
                            console.log(`VITE HMR: ${pluginInfo.name}`);
                            if (i === 1) await this.mainRuntime.updatePlugin(pluginInfo, true);
                            this.callOnHmr(pluginInfo);
                        });
                        w.on("close", () => {
                            tryResolve();
                        });
                    })
            ) ?? []
        );
    }
    get simplePluginList() {
        if (!this.updated) return {};
        const result: Record<string, InfoForRenderer> = {};
        this.plugins.forEach((p, pluginName) => {
            result[pluginName] = makeInfoForRenderer(p);
        });
        return result;
    }
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.mainRuntime.disposeAll();
        return this.closeAllWatchers();
    }
}
