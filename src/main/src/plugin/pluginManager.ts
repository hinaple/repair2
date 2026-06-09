import fs from "fs/promises";
import { join } from "path";
import { buildPlugin } from "./pluginBuild";
import { getManifest, MANIFEST, normalizeManifest, watchManifest } from "./pluginManifest";
import MainRuntimePluginEngine from "./runtimeMain";
import { pluginDir } from "../dirs";
import { createPluginLinkService, type PluginLinkService } from "./pluginLinks";
import {
    createPluginDiagnostics,
    getPluginPhasePriority,
    pluginBuildErrorToSummary,
    pluginErrorToFrom,
    type PluginDiagnostics
} from "./pluginDiagnostics";
import type {
    RawManifest,
    PluginInfo,
    PluginData,
    ManifestError,
    PluginInfoData,
    ManifestWatcher,
    WatchData
} from "./type";
import type { PluginErrorPayload, PluginRunningTarget } from "@shared/plugin.types";
import { createSender, type UpdateHandler, type UpdateSender } from "./sendPluginUpdate";
import type { RollupError, RollupWatcher } from "rollup";
import type { ReportLog } from "../logs/reportLog";
import { logger } from "../logs/logger";

function closeViteWatchers(data: PluginData) {
    if (data.watchers && data.watchers.length)
        return Promise.all(data.watchers.splice(0).map((w) => w.close()));
}

export class PluginManager {
    private devMode: boolean;
    private updated: boolean;
    private pluginDiagnostics: PluginDiagnostics;
    private sendUpdate: UpdateSender;

    destroyed: boolean = false;

    pluginLinkService: PluginLinkService;
    mainRuntime: MainRuntimePluginEngine;

    plugins: Map<string, PluginInfoData>;
    manifestErrors: Map<string, ManifestError> = new Map();
    constructor({
        devMode = false,
        reportLog,
        onupdate
    }: {
        devMode: boolean;
        reportLog: ReportLog;
        onupdate: UpdateHandler;
    }) {
        this.sendUpdate = createSender(this, onupdate);
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
        if (this.plugins.size > 0) logger.info("Plugins", [...this.plugins.keys()].join(", "));
    }
    async setDevMode(isDev: boolean) {
        if (isDev === this.devMode) return;

        this.devMode = isDev;
        if (this.devMode) await this.updateAllPluginInfo({ forceBuild: this.devMode });
        else return this.closeAllWatchers();
    }
    closeAllWatchers() {
        const works = Promise.all([
            ...this.plugins.values().map(({ data }) => {
                const p = Promise.all([closeViteWatchers(data), data.sourceWatcher?.close()]);
                delete data.sourceWatcher;
                return p;
            }),
            ...this.manifestErrors.values().map((w) => w.watch?.close())
        ]);
        // DO NOT clear. manifestError.watch.close() now only removes watch data. must leave error data.
        // this.manifestErrors.clear();
        return works;
    }
    private get watchable() {
        return !this.destroyed && this.devMode;
    }
    private async manifestErrorHandler(
        dir: string,
        manifestDir: string,
        error: string,
        existingWatcher?: ManifestWatcher
    ) {
        await this.manifestErrors.get(dir)?.remove({ sendUpdate: false });

        const errorData: ManifestError = {
            remove: async ({ closeWatcher = true, sendUpdate = false } = {}) => {
                this.manifestErrors.delete(dir);
                if (sendUpdate) this.sendUpdate({ type: "manifest-error" });
                if (closeWatcher) await errorData.watch?.close();
            },
            dir,
            manifestDir,
            lastError: error
        };
        this.manifestErrors.set(dir, errorData);

        if (this.watchable) {
            let ended = false;
            const callback = async () => {
                if (!this.watchable) return errorData.watch?.close();
                if (ended) return;

                const result = await this.updatePluginFromDir(dir, {
                    forceBuild: true,
                    forceUpdateSource: true
                });
                if (result.status === "manifest-error") {
                    errorData.lastError = result.reason;
                    this.sendUpdate({ type: "manifest-error" });
                    return;
                }
                ended = true;
                if (result.status === "succeed") {
                    this.sendUpdate({
                        type: "single",
                        plugin: result.plugin,
                        previous: null,
                        buildChanged: result.builtNow
                    });
                } else if (result.status === "removed") errorData.remove({ sendUpdate: true });
            };
            const closer = () => delete errorData.watch;

            errorData.watch =
                existingWatcher?.setCallbacks(callback, closer) ??
                (await watchManifest(manifestDir, callback, closer));

            if (!this.watchable) errorData.watch?.close();
        }
    }
    private async watchFineManifest({ info, data }: PluginInfoData) {
        if (!this.watchable) return;

        let prevError = this.manifestErrors.get(info.dir);
        const closeErrorWatcher = prevError?.watch?.close;
        prevError?.remove({ closeWatcher: false, sendUpdate: true });

        await data.sourceWatcher?.close();
        if (info.linked && !info.linked.linked) {
            closeErrorWatcher?.();
            return;
        }

        const manifestDir = join(info.linked ? info.linked?.sourcePath : info.path);
        if (prevError && prevError.manifestDir !== manifestDir) {
            await closeErrorWatcher!();
            prevError = undefined;
        }

        let ended = false;
        const callback = async () => {
            if (!this.watchable || ended) return;

            const updateResult = await this.reupdatePlugin({
                info,
                forceBuild: true,
                forceUpdateSource: true
            });
            if ("plugin" in updateResult) {
                info = updateResult.plugin.info;
                return;
            }

            ended = true;
            this.mainRuntime.removePlugin(info.name);
            await closeViteWatchers(data);
            this.plugins.delete(info.name);
            this.sendUpdate({ type: "removed", pluginInfo: info });

            if ("manifestError" in updateResult) {
                await this.manifestErrorHandler(
                    info.dir,
                    manifestDir,
                    updateResult.reason,
                    watching
                );
                this.sendUpdate({ type: "manifest-error" });
            } else watching.close();
        };
        const closer = () => delete data.sourceWatcher;

        const watching =
            prevError?.watch?.setCallbacks(callback, closer) ??
            (await watchManifest(manifestDir, callback, closer));

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
        | { status: "manifest-error"; reason: string; sourcePath?: string }
        | { status: "removed" }
    > {
        const result = await this.getPluginInfoFromDir(dir);

        if (!result.info && !result.isENOENT)
            return { status: "manifest-error", reason: result.reason };

        if (!result.info) return { status: "removed" };

        const tempInfo = result.info;

        let info = tempInfo;
        if (tempInfo.linked && (await this.updateSourceManifest(tempInfo, forceUpdateSource))) {
            const newResult = await this.getPluginInfoFromDir(dir);
            if (!newResult.info && !newResult.isENOENT)
                return {
                    status: "manifest-error",
                    reason: newResult.reason,
                    sourcePath: tempInfo.linked.sourcePath
                };

            if (!newResult.info) return { status: "removed" };

            info = newResult.info;

            const changeResult = await this.changePluginInfo(tempInfo, info, false);
            if (changeResult.error)
                return {
                    status: "manifest-error",
                    reason: changeResult.reason,
                    sourcePath: tempInfo.linked.sourcePath
                };
        } else if (this.checkExistingName(info.name)) {
            return {
                status: "manifest-error",
                reason: `Plugin named "${info.name}" is already exists.`
            };
        }

        const plugin = { info, data: {}, error: {} };
        this.plugins.set(info.name, plugin);
        this.watchFineManifest(plugin);
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
        this.manifestErrors.clear();
        await this.pluginLinkService.getPluginLinks();

        const dirs = await this.getPluginDirList();
        const updatedNames: string[] = [];
        await Promise.all(
            dirs.map(async (dir) => {
                const result = await this.updatePluginFromDir(dir, forceOpt);
                if (result.status === "succeed" && result.builtNow)
                    updatedNames.push(result.plugin.info.name);
                else if (result.status === "manifest-error") {
                    await this.manifestErrorHandler(
                        dir,
                        result.sourcePath ?? join(pluginDir, dir),
                        result.reason
                    );
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
        this.sendUpdate({
            type: "all",
            buildChanges: updatedNames
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
    }): Promise<
        { removed: true } | { manifestError: true; reason: string } | { plugin: PluginInfoData }
    > {
        await this.updateSourceManifest(info, forceUpdateSource);
        const result = await this.getPluginInfoFromDir(info.dir);
        if (!result.info) {
            return result.isENOENT
                ? { removed: true }
                : {
                      manifestError: true,
                      reason: result.reason
                  };
        }
        const changeResult = await this.changePluginInfo(info, result.info, true);
        if (changeResult.error) return { manifestError: true, reason: changeResult.reason };

        const plugin = changeResult.plugin;
        const { builtNow } = await this.ready(plugin, forceBuild, this.devMode);

        this.sendUpdate({
            type: "single",
            plugin,
            previous: info,
            buildChanged: builtNow
        });
        return { plugin };
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
    ): Promise<{ info: PluginInfo } | { reason: string; isENOENT: boolean; info: null }> {
        const manifestResult = await getManifest(join(pluginDir, dir, MANIFEST));
        if (manifestResult.ok === false) {
            if (!manifestResult.silent) {
                await this.pluginDiagnostics.manifestInvalid({
                    dir,
                    content: [manifestResult]
                });
            }
            return {
                reason: manifestResult.detail || manifestResult.reason,
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

        this.pluginDiagnostics.duplicatedName({ name });
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
                    this.pluginDiagnostics.pluginLinksWarning(["Failed to update plugin links"]);
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
            logger.info("PLUGIN BUILDING: " + info.name);
            data.building = (async () => {
                plugin.error = {};
                const buildResult = await buildPlugin(info, {
                    pluginPath: info.linked ? info.linked.sourcePath : info.path,
                    watch
                });

                if (watch && buildResult) {
                    data.watchers = buildResult.watchers;
                    await this.registerWatchers(plugin, buildResult.watchData);
                }
                if (this.destroyed || this.plugins.get(info.name)?.info !== info) {
                    if (buildResult) buildResult.watchers.forEach((w) => w.close());
                    return false;
                }
                this.mainRuntime.updatePlugin(info, true);

                data.ready = true;
                logger.info("PLUGIN BUILT: " + info.name);
                return true;
            })()
                .catch(async (err) => {
                    data.ready = false;
                    this.reportPluginError("renderer", "build", {
                        name: info.name,
                        type: info.type,
                        title: `"${info.name}" build error`,
                        summary: pluginBuildErrorToSummary(err),
                        error: err,
                        from: err ? pluginErrorToFrom(plugin, err) : undefined
                    });

                    return false;
                })
                .finally(() => delete data.building);
            return data.building;
        }
        return data.building;
    }
    private registerWatchers(plugin: PluginInfoData, watchData?: WatchData) {
        const callHmr = (cssCode?: string | null) => {
            this.sendUpdate({
                type: "hmr",
                plugin,
                cssCode: cssCode || undefined
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
                                if (resolved) logger.info(`BUNDLE STARTED: ${plugin.info.name}`);
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
                                    type: plugin.info.type,
                                    title: `"${plugin.info.name}" build error`,
                                    error: errorInThisCycle,
                                    summary: pluginBuildErrorToSummary(errorInThisCycle),
                                    from: pluginErrorToFrom(plugin, errorInThisCycle)
                                });
                            }

                            plugin.data.ready = true;
                            if (i === 0 && watchData?.updated === "none") return;

                            logger.info(`VITE HMR: ${plugin.info.name}`);

                            if (i === 1 && !errorInThisCycle)
                                await this.mainRuntime.updatePlugin(plugin.info, true);

                            callHmr(
                                i === 0 && watchData?.updated === "css" ? watchData.cssCode : null
                            );
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
        pluginPhase: "runtime" | "build",
        {
            name,
            type,
            logType,
            title,
            summary,
            error,
            from,
            phase,
            activeError = true
        }: PluginErrorPayload
    ) {
        const log = this.pluginDiagnostics[
            pluginPhase === "build" ? "buildFailed" : "runtimeError"
        ](
            { name, type },
            [title, error],
            phase ?? pluginPhase,
            logType,
            from ??
                (typeof error !== "string" &&
                "fileName" in error &&
                typeof error.fileName === "string"
                    ? {
                          filename: error.fileName,
                          lineNumber: error.line ?? error.lineNumber ?? undefined,
                          columnNumber: error.column ?? error.columnNumber ?? undefined
                      }
                    : undefined)
        );

        if (!activeError) return;

        const plugin = this.plugins.get(name);
        if (!plugin) return;

        const prevError = plugin.error[target];
        if (
            prevError &&
            (!log.phase ||
                getPluginPhasePriority(prevError.phase) < getPluginPhasePriority(log.phase))
        )
            return;
        plugin.error[target] = {
            phase: phase ?? pluginPhase,
            title,
            summary,
            logId: log.id
        };
        if (pluginPhase === "runtime") {
            this.sendUpdate({
                type: "runtime-error",
                plugin
            });
        }
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.mainRuntime.disposeAll();
        return this.closeAllWatchers();
    }
}
