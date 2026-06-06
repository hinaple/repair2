import fs from "fs/promises";
import { join } from "path";
import { RawManifest, PluginInfo, PluginRendererInfo, PluginType } from "./type";
import { buildPlugin } from "./pluginBuild";
import { getManifest, MANIFEST, normalizeManifest } from "./pluginManifest";
import MainRuntimePluginEngine from "./runtimeMain";
import type { ReportLog } from "../logs/reportLog";
import { pluginDir } from "../dirs";
import { createPluginLinkService, PluginLinkService } from "./pluginLinks";
import {
    createPluginDiagnostics,
    getPluginPhasePriority,
    pluginBuildErrorToSummary,
    type PluginDiagnostics
} from "./pluginDiagnostics";
import type { RollupError, RollupWatcher } from "rollup";
import type { ChokidarOptions, FSWatcher } from "chokidar";
import { cli } from "../console";
import { PluginErrorPayload, PluginRunningTarget, PluginErrorData } from "@shared/plugin.types";

type PreviousData = {
    type: PluginType;
    name: string;
};

type PluginInfoData = {
    info: PluginInfo;
    data: PluginData;
    error: Partial<Record<PluginRunningTarget, PluginErrorData>>;
};

type PluginData = {
    building?: Promise<boolean>;
    ready?: boolean;
    watchers?: RollupWatcher[];
    sourceWatcher?: { watcher: FSWatcher; close: () => Promise<void> };
};

export type UpdateHandlerParams =
    | {
          type: "single";
          updateData: {
              info: InfoForRenderer;
              previous: PreviousData | null;
              buildChanged: boolean;
          };
      }
    | {
          type: "all";
          updateData: {
              buildChanges: string[];
              errors?: { dir: string; reason?: string }[];
          };
      }
    | {
          type: "manifest-error";
          updateData: {
              dir: string;
              reason?: string;
          };
      }
    | {
          type: "runtime-error";
          updateData: {
              info: InfoForRenderer;
          };
      }
    | {
          type: "hmr";
          updateData: InfoForRenderer;
      };
type UpdateHandler = (updateInfo: UpdateHandlerParams) => void;

function closeViteWatchers(data: PluginData) {
    if (data.watchers && data.watchers.length)
        return Promise.all(data.watchers.splice(0).map((w) => w.close()));
}

type InfoForRenderer = PluginRendererInfo;

function makeInfoForRenderer({ info, data, error }: PluginInfoData): InfoForRenderer {
    const errorEntries = Object.entries(error);
    return { ...info, ready: !!data.ready, error: errorEntries.length ? errorEntries : null };
}

export class PluginManager {
    private devMode: boolean;
    private updated: boolean;
    private pluginDiagnostics: PluginDiagnostics;
    private _onupdate?: UpdateHandler;
    private errorWatchers: Set<{ watcher: FSWatcher; close: () => Promise<void> }> = new Set();

    private destroyed: boolean = false;

    pluginLinkService: PluginLinkService;
    mainRuntime: MainRuntimePluginEngine;

    plugins: Map<string, PluginInfoData>;
    constructor({
        devMode = false,
        reportLog,
        onupdate
    }: {
        devMode: boolean;
        reportLog: ReportLog;
        onupdate?: UpdateHandler;
    }) {
        if (onupdate) this.onupdate(onupdate);
        this.plugins = new Map();
        this.devMode = devMode;
        this.updated = false;
        this.pluginDiagnostics = createPluginDiagnostics(reportLog);
        this.pluginLinkService = createPluginLinkService({
            pluginDiagnostics: this.pluginDiagnostics
        });
        this.mainRuntime = new MainRuntimePluginEngine({
            pluginDir,
            pluginDiagnostics: this.pluginDiagnostics
        });
    }
    async initialize() {
        if (this.updated) return;

        await this.ensureDirectories();
        await this.updateAllPluginInfo({ forceBuild: this.devMode });
        if (this.plugins.size > 0) cli.info("Plugins", [...this.plugins.keys()].join(", "));
    }
    async setDevMode(isDev: boolean) {
        if (isDev === this.devMode) return;

        this.devMode = isDev;
        if (this.devMode) await this.updateAllPluginInfo({ forceBuild: this.devMode });
        else return this.closeAllWatchers();
    }
    onupdate(updateHandler: UpdateHandler) {
        this._onupdate = updateHandler;
    }
    private callOnUpdate(onupdateParam: UpdateHandlerParams) {
        if (this.destroyed || !this._onupdate) return;
        return this._onupdate(onupdateParam);
    }
    closeAllWatchers() {
        const works = Promise.all([
            ...this.plugins.values().map(({ data }) => {
                const p = Promise.all([closeViteWatchers(data), data.sourceWatcher?.close()]);
                delete data.sourceWatcher;
                return p;
            }),
            ...this.errorWatchers.values().map((w) => w.close())
        ]);
        this.errorWatchers.clear();
        return works;
    }
    private get watchable() {
        return !this.destroyed && this.devMode;
    }
    private async watchErrorManifest(dir: string, manifestDir: string) {
        if (!this.watchable) return;

        const watching = await watchManifest(
            manifestDir,
            async () => {
                if (!this.watchable) return watching.close();

                const result = await this.updatePluginFromDir(dir);
                if (result.status === "error") {
                    this.callOnUpdate({
                        type: "manifest-error",
                        updateData: {
                            dir,
                            reason: result.reason
                        }
                    });
                    return;
                }
                if (result.status === "succeed") {
                    this.callOnUpdate({
                        type: "single",
                        updateData: {
                            info: makeInfoForRenderer(result.plugin),
                            previous: null,
                            buildChanged: result.builtNow
                        }
                    });
                }
                watching.close();
            },
            () => this.errorWatchers.delete(watching)
        );

        if (!this.watchable) return watching.close();

        this.errorWatchers.add(watching);
    }
    private async watchFineManifest({ info, data }: PluginInfoData) {
        if ((info.linked && !info.linked.linked) || !this.watchable) return;

        await data.sourceWatcher?.close();
        if (info.linked && !info.linked.linked) return;
        const manifestDir = join(info.linked ? info.linked?.sourcePath : info.path);

        const watching = await watchManifest(
            manifestDir,
            async () => {
                const updateResult = await this.reupdatePlugin({
                    info,
                    forceBuild: true,
                    forceUpdateSource: true
                });
                if (updateResult.plugin) info = updateResult.plugin.info;
            },
            () => delete data.sourceWatcher
        );

        if (!this.watchable || this.plugins.get(info.name)?.info !== info) {
            watching.close();
            return;
        }
        data.sourceWatcher = watching;
    }

    private ensureDirectories() {
        return fs.access(pluginDir).catch(() => fs.mkdir(pluginDir));
    }
    private async getPluginDirList() {
        return (await fs.readdir(pluginDir, { withFileTypes: true })).reduce(
            (dirs: string[], dirent) => {
                if (dirent.isDirectory()) dirs.push(dirent.name);
                return dirs;
            },
            []
        );
    }

    private async updatePluginFromDir(
        dir: string,
        { forceBuild = false, forceUpdateSource = false } = {}
    ): Promise<
        | { status: "succeed"; plugin: PluginInfoData; builtNow: boolean }
        | { status: "error"; reason?: string; sourcePath?: string }
        | { status: "removed" }
    > {
        const result = await this.getPluginInfoFromDir(dir);

        if (!result.info && !result.isENOENT) return { status: "error", reason: result.reason };

        if (!result.info) return { status: "removed" };

        const tempInfo = result.info;

        const manifestChanged = await this.updateSourceManifest(tempInfo, forceUpdateSource);
        let info = tempInfo;
        if (tempInfo.linked && manifestChanged) {
            const newResult = await this.getPluginInfoFromDir(dir);
            if (!newResult.info && !newResult.isENOENT)
                return {
                    status: "error",
                    reason: newResult.reason,
                    sourcePath: tempInfo.linked.sourcePath
                };

            if (!newResult.info) return { status: "removed" };

            info = newResult.info;

            const changeResult = await this.changePluginInfo(tempInfo, info, false);
            if (changeResult.error)
                return {
                    status: "error",
                    reason: changeResult.reason,
                    sourcePath: tempInfo.linked.sourcePath
                };
        } else if (this.checkExistingName(info.name)) {
            return { status: "error", reason: "Duplicated plugin name" };
        }

        const plugin = { info, data: {}, error: {} };
        this.plugins.set(info.name, plugin);
        if (this.watchable) this.watchFineManifest(plugin);
        const readyResult = await this.ready(plugin, forceBuild, this.devMode);
        return {
            status: "succeed",
            plugin,
            builtNow: readyResult.builtNow
        };
    }
    async updateAllPluginInfo(
        forceOpt: { forceBuild?: boolean; forceUpdateSource?: boolean } = {}
    ) {
        this.updated = false;
        await this.closeAllWatchers();
        this.plugins.clear();
        await this.pluginLinkService.getPluginLinks();

        const dirs = await this.getPluginDirList();
        const updatedNames: string[] = [];
        const errors: { reason?: string; dir: string }[] = [];
        await Promise.all(
            dirs.map(async (dir) => {
                const result = await this.updatePluginFromDir(dir, forceOpt);
                if (result.status === "succeed" && result.builtNow)
                    updatedNames.push(result.plugin.info.name);
                else if (result.status === "error") {
                    errors.push({ dir, reason: result.reason });
                    await this.watchErrorManifest(dir, result.sourcePath ?? join(pluginDir, dir));
                }
            })
        );
        this.mainRuntime.removeAllPluginExcept(
            this.plugins
                .values()
                .filter(({ info }) => info.type === "runtime" && info.main)
                .map((p) => p.info.name)
                .toArray()
        );
        this.updated = true;
        this.callOnUpdate({
            type: "all",
            updateData: {
                buildChanges: updatedNames,
                errors
            }
        });
    }

    async reupdatePlugin({
        info,
        forceBuild = false,
        forceUpdateSource = false
    }: {
        info: PluginInfo;
        forceBuild: boolean;
        forceUpdateSource: boolean;
    }): Promise<{ error: boolean; plugin: PluginInfoData | null }> {
        await this.updateSourceManifest(info, forceUpdateSource);
        const result = await this.getPluginInfoFromDir(info.dir);
        if (!result.info) {
            if (result.isENOENT) this.updateAllPluginInfo();
            return { error: !result.isENOENT, plugin: null };
        }
        const { error: secondErr, plugin } = await this.changePluginInfo(info, result.info, true);
        if (secondErr) return { error: true, plugin: null };

        const { builtNow } = await this.ready(plugin, forceBuild, this.devMode);

        this.callOnUpdate({
            type: "single",
            updateData: {
                info: makeInfoForRenderer(plugin),
                previous: info,
                buildChanged: builtNow
            }
        });
        return { error: false, plugin };
    }

    private async getPluginLinkedInfo(pluginName: string) {
        const links = await this.pluginLinkService.getPluginLinks();
        const linkedInfo = links ? links[pluginName] : null;

        return linkedInfo;
    }

    private async makePluginInfo(rawManifest: RawManifest, dir: string): Promise<PluginInfo> {
        const manifest = normalizeManifest(rawManifest);

        return {
            dir,
            path: join(pluginDir, dir),
            distFile: join(dir, manifest.outDir, "index.js"),
            ...(manifest.main
                ? { mainDistFile: join(dir, manifest.main.outDir, "index.cjs") }
                : null),
            linked: await this.getPluginLinkedInfo(manifest.name),
            ...manifest
        };
    }

    private async getPluginInfoFromDir(
        dir: string
    ): Promise<{ info: PluginInfo } | { reason?: string; isENOENT: boolean; info: null }> {
        const manifestResult = await getManifest(join(pluginDir, dir, MANIFEST));
        if (manifestResult.ok === false) {
            if (!manifestResult.silent) {
                await this.pluginDiagnostics.manifestInvalid({
                    dir,
                    detail: manifestResult.detail,
                    error: manifestResult.error,
                    reason: manifestResult.reason
                });
            }
            return {
                reason: manifestResult.detail,
                isENOENT: !!manifestResult.isENOENT,
                info: null
            };
        }
        const rawManifest: RawManifest = manifestResult.data;
        return { info: await this.makePluginInfo(rawManifest, dir) };
    }

    private async updateSourceManifest(info: PluginInfo, force = false): Promise<boolean> {
        if (!info.linked || !info.linked.linked) return false;

        const linkUpdateResult = await this.pluginLinkService.updateManifestFromSource(
            info.linked.sourcePath,
            info.path,
            force,
            info
        );
        if ("unlinked" in linkUpdateResult) info.linked.linked = !linkUpdateResult?.unlinked;
        if (!linkUpdateResult.updated || !info.linked.linked) return false;

        return true;
    }

    private checkExistingName(name: string) {
        if (!this.plugins.has(name)) return false;

        this.pluginDiagnostics.duplicatedName(name);
        return true;
    }

    private async changePluginInfo(
        oldInfo: PluginInfo,
        newInfo: PluginInfo,
        checkExisting: true
    ): Promise<
        { error: true; reason: string; plugin: null } | { error: false; plugin: PluginInfoData }
    >;
    private async changePluginInfo(
        oldInfo: PluginInfo,
        newInfo: PluginInfo,
        checkExisting: false
    ): Promise<{ plugin: null } & ({ error: true; reason: string } | { error: false })>;
    private async changePluginInfo(
        oldInfo: PluginInfo,
        newInfo: PluginInfo,
        checkExisting: boolean = true
    ): Promise<{ error: boolean; reason?: string; plugin: null | PluginInfoData }> {
        if (newInfo.name !== oldInfo.name) {
            if (this.checkExistingName(newInfo.name))
                return { error: true, reason: "Duplicated plugin name", plugin: null };
            if (oldInfo.linked) {
                const replaceSucceed = await this.pluginLinkService.replaceName(
                    oldInfo.name,
                    newInfo.name
                );
                if (replaceSucceed) newInfo.linked = await this.getPluginLinkedInfo(newInfo.name);
                else {
                    this.pluginDiagnostics.pluginLinksWarning("Failed to update plugin links");
                    return { error: true, reason: "Failed to update pligin links", plugin: null };
                }
            }
        }

        if (!checkExisting) return { error: false, plugin: null };

        if (
            newInfo.name !== oldInfo.name ||
            newInfo.type !== oldInfo.type ||
            (!newInfo.main && oldInfo.main)
        )
            this.mainRuntime.removePlugin(oldInfo.name);

        const tempPlugin = this.plugins.get(oldInfo.name);
        if (!tempPlugin) {
            this.pluginDiagnostics.pluginInfoMissing();
            return { error: true, reason: "Plugin information not found", plugin: null };
        }
        this.plugins.delete(oldInfo.name);
        const newPlugin: PluginInfoData = { info: newInfo, data: tempPlugin.data, error: {} };
        this.plugins.set(newInfo.name, newPlugin);
        return { error: false, plugin: newPlugin };
    }

    private async ready(
        plugin: PluginInfoData,
        forceBuild = false,
        watch = this.devMode
    ): Promise<{ builtNow: boolean }> {
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
        const builtNow = await this.buildPlugin(plugin, watch);

        return { builtNow };
    }

    private async isBuilt(pluginInfo: PluginInfo) {
        const files = [pluginInfo.distFile, pluginInfo.mainDistFile].filter(Boolean);
        return Promise.all(files.map((file) => fs.access(join(pluginDir, file as string))))
            .then(() => true)
            .catch(() => false);
    }
    private async buildPlugin(plugin: PluginInfoData, watch = this.devMode): Promise<boolean> {
        const { info, data } = plugin;
        await closeViteWatchers(data);
        if (!data.building) {
            cli.info("PLUGIN BUILDING: " + info.name);
            data.building = (async () => {
                plugin.error = {};
                const buildResult = await buildPlugin(info, {
                    pluginPath: info.linked ? info.linked.sourcePath : info.path,
                    watch
                });

                if (watch) {
                    data.watchers = buildResult as RollupWatcher[];
                    await this.registerWatchers(plugin);
                }
                if (this.destroyed || this.plugins.get(info.name)?.info !== info) {
                    if (watch) (buildResult as RollupWatcher[]).forEach((w) => w.close());
                    return false;
                }
                this.mainRuntime.updatePlugin(info, true);

                data.ready = true;
                cli.info("PLUGIN BUILT: " + info.name);
                return true;
            })()
                .catch(async (err) => {
                    data.ready = false;
                    this.reportPluginError("renderer", "build", {
                        name: info.name,
                        title: `"${plugin.info.name}" build error`,
                        error: err,
                        logOptions: {
                            summary: pluginBuildErrorToSummary(err)
                        }
                    });

                    return false;
                })
                .finally(() => delete data.building);
            return data.building;
        }
        return data.building;
    }
    private registerWatchers(plugin: PluginInfoData) {
        const callHmr = () => {
            this.callOnUpdate({
                type: "hmr",
                updateData: makeInfoForRenderer(plugin)
            });
        };
        return Promise.all(
            plugin.data.watchers?.map(
                (w, i) =>
                    new Promise((res, rej) => {
                        let resolved = false;
                        const tryResolve = (err: RollupError | null) => {
                            if (resolved) return false;
                            err ? rej(err) : res(null);
                            resolved = true;
                            return true;
                        };
                        let errorInThisCycle: RollupError | null;
                        const buildTarget = i === 0 ? "renderer" : "main";
                        w.on("event", async (evt) => {
                            if (evt.code === "START") {
                                errorInThisCycle = null;
                                if (plugin.error[buildTarget]) delete plugin.error[buildTarget];
                                plugin.data.ready = false;
                                if (resolved) cli.info(`BUNDLE STARTED: ${plugin.info.name}`);
                                return;
                            }
                            if (evt.code === "ERROR") {
                                errorInThisCycle = evt.error;
                                plugin.data.ready = false;
                                return;
                            }
                            if (evt.code !== "END" || tryResolve(errorInThisCycle)) return;

                            if (errorInThisCycle) {
                                this.reportPluginError(buildTarget, "build", {
                                    name: plugin.info.name,
                                    title: `"${plugin.info.name}" build error`,
                                    error: errorInThisCycle,
                                    logOptions: {
                                        summary: pluginBuildErrorToSummary(errorInThisCycle)
                                    }
                                });
                            }

                            plugin.data.ready = true;
                            cli.info(`VITE HMR: ${plugin.info.name}`);
                            if (i === 1 && !errorInThisCycle)
                                await this.mainRuntime.updatePlugin(plugin.info, true);
                            callHmr();
                        });
                        w.on("close", () => {
                            tryResolve(errorInThisCycle);
                        });
                    })
            ) ?? []
        );
    }

    reportPluginError(
        target: PluginRunningTarget,
        phase: "runtime" | "build",
        { name, title, error, logOptions = {} }: PluginErrorPayload
    ) {
        const plugin = this.plugins.get(name);
        if (!plugin) return;

        const log = this.pluginDiagnostics[phase === "build" ? "buildFailed" : "runtimeError"](
            plugin.info,
            error,
            title,
            logOptions
        );
        const prevError = plugin.error[target];
        if (
            prevError &&
            (!log.phase ||
                getPluginPhasePriority(prevError.phase) < getPluginPhasePriority(log.phase))
        )
            return;
        plugin.error[target] = {
            phase,
            title: log.title,
            detail: error,
            logId: log.id,
            summary: log.summary
        };
        if (phase === "runtime") {
            this.callOnUpdate({
                type: "runtime-error",
                updateData: { info: makeInfoForRenderer(plugin) }
            });
        }
    }

    get simplePluginList() {
        if (!this.updated) return {};
        const result: Record<string, InfoForRenderer> = {};
        this.plugins.forEach((p, pluginName) => {
            if (typeof p.info.exports === "object" && Object.keys(p.info.exports).length)
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

async function watch(paths: string | string[], options?: ChokidarOptions) {
    const w = (await import("chokidar")).watch;
    return w(paths, options);
}

const MANIFEST_DEBOUNCE = 200;
async function watchManifest(
    manifestDir: string,
    callback: (type: "change" | "unlink" | "add") => void,
    closer: () => any
): Promise<{ watcher: FSWatcher; close: () => Promise<void> }> {
    let closed = false;
    const close = async () => {
        if (closed) return;

        closed = true;
        if (timeout) clearTimeout(timeout);
        closer();
        await watcher.close();
    };

    let timeout: NodeJS.Timeout | null = null;
    const watchHandler = async (type: "change" | "unlink" | "add") => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
            timeout = null;
            callback(type);
            cli.info("MANIFEST HMR", manifestDir);
        }, MANIFEST_DEBOUNCE);
    };
    const watcher = (
        await watch(join(manifestDir, MANIFEST), {
            ignoreInitial: true
        })
    )
        .on("change", () => watchHandler("change"))
        .on("unlink", () => watchHandler("unlink"))
        .on("add", () => watchHandler("add"));
    return { watcher, close };
}
