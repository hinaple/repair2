import { dialog, shell, type BrowserWindow, type OpenDialogOptions } from "electron";
import { createEmptyPlugin, PLUGIN_ENTRY_TYPE } from "../plugin/createEmptyPlugin";
import type { PluginManager } from "../plugin/pluginManager";
import { PluginErrorPayload } from "@shared/plugin.types";
import { makeManifestErrorsForRenderer, makeSimplePluginList } from "../plugin/sendPluginUpdate";
import { logger } from "../logs/logger";
import { ipc } from "./ipcMethods";

type PluginRuntimeDeactivatePayload = {
    pluginName: string;
    activationId: string;
};

function requirePluginManager(getPluginManager: () => PluginManager | null): PluginManager;
function requirePluginManager(
    getPluginManager: () => PluginManager | null,
    soft: boolean
): PluginManager | null;
function requirePluginManager(getPluginManager: () => PluginManager | null, soft: boolean = false) {
    const pluginManager = getPluginManager();
    if (!pluginManager && soft) return null;
    if (!pluginManager) throw new Error("PluginManager is not initialized.");
    return pluginManager;
}

export function setupPluginIpc({
    getPluginManager,
    getDialogOwnerWindow
}: {
    getPluginManager: () => PluginManager | null;
    getDialogOwnerWindow: () => BrowserWindow | null;
}) {
    ipc.handle("plugin:get-list", () => {
        const pluginMap = requirePluginManager(getPluginManager)?.plugins;
        if (!pluginMap) return {};
        return makeSimplePluginList(pluginMap);
    });
    ipc.handle("plugin:get-manifest-errors", () => {
        const pluginManager = requirePluginManager(getPluginManager);
        if (!pluginManager) return [];
        return makeManifestErrorsForRenderer(pluginManager);
    });

    ipc.handle(
        "plugin:runtime:activate",
        async (
            evt,
            pluginName: string,
            payload: {
                activationId: string;
                rendererMethods: string[];
                attributes: Record<string, any>;
            }
        ) => {
            const { activationId, rendererMethods, attributes } = payload;
            logger.info("PLUGIN ACTIVATING: ", pluginName);
            const pluginManager = requirePluginManager(getPluginManager);
            const instance = await pluginManager.mainRuntime.createInstance(
                pluginName,
                activationId
            );
            if (!instance) return null;
            try {
                await instance.activate(rendererMethods, attributes);
                return instance.mainMethods;
            } catch (err) {
                pluginManager.mainRuntime.disposeInstance(pluginName, activationId);
                throw err;
            }
        }
    );

    ipc.handle("plugin:runtime:deactivate", (evt, payload: PluginRuntimeDeactivatePayload) => {
        return requirePluginManager(getPluginManager, true)?.mainRuntime.disposeInstance(
            payload.pluginName,
            payload.activationId
        );
    });

    ipc.on("plugin:runtime:deactivate-all", (evt) => {
        requirePluginManager(getPluginManager, true)?.mainRuntime.disposeAll();
    });

    ipc.handle(
        "plugin:runtime:to-main",
        (
            evt,
            payload: PluginRuntimeDeactivatePayload & {
                methodName: string;
                args: unknown[];
            }
        ) => {
            const { pluginName, activationId, methodName, args } = payload;
            const instance = requirePluginManager(getPluginManager).mainRuntime.getActiveInstance(
                pluginName,
                activationId
            );
            if (!instance) return null;
            return instance.callMainMethod(methodName, args);
        }
    );

    ipc.handle(
        "plugin:create",
        async (
            evt,
            {
                name,
                type,
                isExternal
            }: {
                name: string;
                type: PLUGIN_ENTRY_TYPE;
                isExternal: boolean;
            }
        ) => {
            let path: string | undefined;
            if (isExternal) {
                const ownerWindow = getDialogOwnerWindow();
                const openOptions: OpenDialogOptions = {
                    title: "Select the plugin directory",
                    properties: ["openDirectory"]
                };
                const selected = ownerWindow
                    ? await dialog.showOpenDialog(ownerWindow, openOptions)
                    : await dialog.showOpenDialog(openOptions);
                if (selected.canceled) return { canceled: true as const };
                path = selected.filePaths[0] as string;
            }
            const createResult = await createEmptyPlugin(name, type, {
                root: path,
                skipNameValidation: false
            });
            if ("error" in createResult)
                return { canceled: true as const, error: createResult.error };
            if (isExternal) {
                const linkResult = await requirePluginManager(
                    getPluginManager
                ).pluginLinkService.addPluginLink(createResult.dir, false);
                if (!linkResult) return { canceled: true as const };
            }
            shell.openPath(createResult.dir);
            await requirePluginManager(getPluginManager).updateAllPluginInfo();
            return { dir: createResult.dir };
        }
    );

    ipc.handle("plugin:runtime-error", (_, payload: PluginErrorPayload) => {
        requirePluginManager(getPluginManager).reportPluginError("renderer", "runtime", payload);
    });
}
