import { createEmptyPlugin } from "../plugin/createEmptyPlugin";
import { makeManifestErrorsForRenderer, makeSimplePluginList } from "../plugin/sendPluginUpdate";
import { logger } from "../logs/logger";
import { ipc } from "./ipcMethods";
import type { PluginManager } from "../plugin/pluginManager";
import type { MainApp } from "../app/mainApp";

function requirePluginManager(app: MainApp): PluginManager;
function requirePluginManager(app: MainApp, soft: boolean): PluginManager | null;
function requirePluginManager(app: MainApp, soft: boolean = false) {
    const pluginManager = app.service.pluginManager;
    if (!pluginManager && soft) return null;
    if (!pluginManager) throw new Error("PluginManager is not initialized.");
    return pluginManager;
}

export function setupPluginIpc(app: MainApp) {
    ipc.handle("plugin:get-list", () => {
        const pluginMap = requirePluginManager(app)?.plugins;
        if (!pluginMap) return {};
        return makeSimplePluginList(pluginMap);
    });
    ipc.handle("plugin:get-manifest-errors", () => {
        const pluginManager = requirePluginManager(app);
        if (!pluginManager) return [];
        return makeManifestErrorsForRenderer(pluginManager);
    });

    ipc.handle("plugin:runtime:activate", async (evt, pluginName, payload) => {
        const { activationId, rendererMethods, attributes } = payload;
        logger.info("PLUGIN ACTIVATING: ", pluginName);
        const pluginManager = requirePluginManager(app);
        const instance = await pluginManager.mainRuntime.createInstance(pluginName, activationId);
        if (!instance) return null;
        try {
            await instance.activate(rendererMethods, attributes);
            return instance.mainMethods;
        } catch (err) {
            pluginManager.mainRuntime.disposeInstance(pluginName, activationId);
            throw err;
        }
    });

    ipc.handle("plugin:runtime:deactivate", (evt, payload) => {
        return requirePluginManager(app, true)?.mainRuntime.disposeInstance(
            payload.pluginName,
            payload.activationId
        );
    });

    ipc.on("plugin:runtime:deactivate-all", (evt) => {
        requirePluginManager(app, true)?.mainRuntime.disposeAll();
    });

    ipc.handle("plugin:runtime:to-main", (evt, payload) => {
        const { pluginName, activationId, methodName, args } = payload;
        const instance = requirePluginManager(app).mainRuntime.getActiveInstance(
            pluginName,
            activationId
        );
        if (!instance) return null;
        return instance.callMainMethod(methodName, args);
    });

    ipc.handle("plugin:create", async (evt, { name, type, isExternal }) => {
        let path: string | undefined;
        if (isExternal) {
            const selected = await app.system.dialog.showOpenDialog({
                title: "Select the plugin directory",
                properties: ["openDirectory"]
            });
            if (selected.canceled) return { canceled: true as const };
            path = selected.filePaths[0] as string;
        }
        const createResult = await createEmptyPlugin(name, type, {
            root: path,
            skipNameValidation: false
        });
        if ("error" in createResult) return { canceled: true as const, error: createResult.error };
        if (isExternal) {
            const linkResult = await requirePluginManager(app).pluginLinkService.addPluginLink(
                createResult.dir,
                false
            );
            if (!linkResult) return { canceled: true as const };
        }
        app.system.shell.openPath(createResult.dir);
        await requirePluginManager(app).updateAllPluginInfo();
        return { dir: createResult.dir };
    });

    ipc.handle("plugin:runtime-error", (_, payload) => {
        requirePluginManager(app).reportPluginError("renderer", "runtime", payload);
    });
}
