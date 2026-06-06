import fs from "fs/promises";
import { join } from "path";
import { PluginManager, UpdateHandlerParams } from "../plugin/pluginManager";
import { createHmr } from "../hmrs";
import type { ReportLog } from "../logs/reportLog";
import type { MainContext } from "../app/mainContext.types";
import { cli } from "../console";

type PluginHmrControllerOptions = {
    context: MainContext;
    dirs: {
        dataDir: string;
        pluginDir: string;
        styleDir: string;
    };
    reportLog: ReportLog;
};

export class PluginHmrController {
    #context: MainContext;
    #dataDir: string;
    #pluginDir: string;
    #reportLog: ReportLog;
    #styleDir: string;

    constructor({ context, dirs, reportLog }: PluginHmrControllerOptions) {
        this.#context = context;
        this.#dataDir = dirs.dataDir;
        this.#pluginDir = dirs.pluginDir;
        this.#reportLog = reportLog;
        this.#styleDir = dirs.styleDir;
    }

    #requirePluginManager() {
        const { service } = this.#context;
        if (!service.pluginManager) throw new Error("PluginManager is not initialized.");
        return service.pluginManager;
    }

    async updateCss() {
        const { state } = this.#context;
        try {
            state.project.cssCode = String(
                await fs.readFile(join(this.#styleDir, "global.css"))
            ).replace(/%FONTS%/g, join(this.#styleDir, "fonts").replace(/\\/g, "/"));
        } catch (err) {
            this.#reportLog({
                level: "error",
                title: "Failed to load global.css file",
                error: err,
                source: "project",
                dialogue: false,
                type: "global-css",
                phase: "load",
                summary: "Failed to load global.css file",
                subject: { kind: "project", id: "global.css", type: "style" }
            });
        }
        return state.project.cssCode;
    }

    async setHmrActive(active: boolean) {
        const { state, service, message } = this.#context;
        if (state.hmr.isActive === active) return;
        state.hmr.isActive = active;

        if (state.hmr.importing) await state.hmr.importing;

        if (!state.hmr.setter) {
            state.hmr.importing = (async () => {
                state.hmr.setter = createHmr({
                    onHmr: (type) => {
                        if (type === "css") {
                            this.updateCss().then((css) => message.sendToMain("global-css", css));
                            return;
                        }

                        this.#requirePluginManager().updateAllPluginInfo({});
                    },
                    styleDir: this.#styleDir,
                    pluginDir: this.#pluginDir,
                    dataDir: this.#dataDir
                });
                return state.hmr.setter(state.hmr.isActive);
            })();
            try {
                return await state.hmr.importing;
            } catch (err) {
                state.hmr.setter = null;
                throw err;
            } finally {
                state.hmr.importing = null;
            }
        }

        return state.hmr.setter(active);
    }

    async setDevMode(devMode: boolean) {
        const { state, service } = this.#context;
        const pluginManager = service.pluginManager;
        if (pluginManager) await pluginManager.setDevMode(!!state.project.data?.config?.devMode);
        return this.setHmrActive(devMode);
    }

    async setPluginManager(devMode = false) {
        const { service, message } = this.#context;
        if (service.pluginManager) await this.destroyPluginManager();
        const pluginManager = new PluginManager({
            devMode,
            reportLog: this.#reportLog,
            onupdate: ({ type, updateData }: UpdateHandlerParams) => {
                if (type === "single") {
                    message.sendToEditor("plugin:update", updateData);
                    message.sendToMain("plugin:update", updateData);
                } else if (type === "all") {
                    const pluginList = this.#requirePluginManager().simplePluginList;
                    message.sendToEditor("plugin:list", pluginList, updateData);
                    message.sendToMain("plugin:list", pluginList, updateData.buildChanges);
                } else if (type === "hmr") {
                    message.sendToEditor("plugin:hmr", updateData);
                    message.sendToMain("plugin:hmr", updateData);
                } else if (type === "runtime-error") {
                    message.sendToEditor("plugin:update", {
                        info: updateData.info,
                        previous: null,
                        buildChanged: false
                    });
                } else cli.error(type, JSON.stringify(updateData, null, 2));
            }
        });
        service.pluginManager = pluginManager;
        return pluginManager.initialize();
    }

    async destroyPluginManager() {
        const { service } = this.#context;
        if (!service.pluginManager) return;

        const tempPM = service.pluginManager;
        service.pluginManager = null;
        return await tempPM.destroy();
    }
}
