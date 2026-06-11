import fs from "fs/promises";
import { join } from "path";
import { PluginManager } from "../plugin/pluginManager";
import { createHmr } from "../hmrs";
import type { MainApp } from "../app/mainApp";
import { logger } from "../logs/logger";

export class PluginHmrController {
    #app: MainApp;

    constructor(app: MainApp) {
        this.#app = app;
    }

    #requirePluginManager() {
        const { service } = this.#app;
        if (!service.pluginManager) throw new Error("PluginManager is not initialized.");
        return service.pluginManager;
    }

    async updateCss() {
        const { paths, state } = this.#app;
        try {
            state.project.cssCode = String(
                await fs.readFile(join(paths.styleDir, "global.css"))
            ).replace(/%FONTS%/g, join(paths.styleDir, "fonts").replace(/\\/g, "/"));
        } catch (err) {
            logger
                .with({
                    source: "project",
                    dialog: false,
                    type: "global-css",
                    phase: "load",
                    subject: { kind: "project", id: "global.css", type: "style" }
                })
                .error("global.css 파일 로드 중 오류가 발생했습니다:", err as any);
        }
        return state.project.cssCode;
    }

    async setHmrActive(active: boolean) {
        const { message, paths, state } = this.#app;
        if (state.hmr.isActive === active) return;
        state.hmr.isActive = active;

        if (state.hmr.importing) await state.hmr.importing;

        if (!state.hmr.setter) {
            state.hmr.importing = (async () => {
                state.hmr.setter = createHmr({
                    onHmr: (type) => {
                        if (type === "css") {
                            this.updateCss().then((css) => message.sendToPlay("global-css", css));
                            return;
                        }

                        this.#requirePluginManager().updateAllPluginInfo({});
                    },
                    styleDir: paths.styleDir,
                    pluginDir: paths.pluginDir,
                    dataDir: paths.dataDir
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
        const { service } = this.#app;
        const pluginManager = service.pluginManager;
        if (pluginManager) await pluginManager.setDevMode(devMode);
        return this.setHmrActive(devMode);
    }

    async setPluginManager(devMode = false) {
        const { service, message } = this.#app;
        if (service.pluginManager) await this.destroyPluginManager();
        const pluginManager = new PluginManager(message, {
            devMode,
            onupdate: ({ type, updateData }) => {
                if (type === "single") {
                    message.sendToEditor("plugin:update", updateData);
                    message.sendToPlay("plugin:update", updateData);
                } else if (type === "all") {
                    message.sendToEditor("plugin:list", updateData);
                    message.sendToPlay("plugin:list", updateData);
                } else if (type === "hmr") {
                    message.sendToEditor("plugin:hmr", updateData);
                    message.sendToPlay("plugin:hmr", updateData);
                } else if (type === "runtime-error") {
                    message.sendToEditor("plugin:update", {
                        info: updateData.info,
                        previous: null,
                        buildChanged: false
                    });
                } else if (type === "removed") {
                    message.sendToEditor("plugin:removed", updateData.info);
                    message.sendToPlay("plugin:removed", updateData.info);
                } else if (type === "manifest-error") {
                    message.sendToEditor("plugin:manifest-error", updateData.manifestErrors);
                }
            }
        });
        service.pluginManager = pluginManager;
        return pluginManager.initialize();
    }

    async destroyPluginManager() {
        const { service } = this.#app;
        if (!service.pluginManager) return;

        const tempPM = service.pluginManager;
        service.pluginManager = null;
        return await tempPM.destroy();
    }
}
