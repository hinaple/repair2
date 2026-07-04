import { createPluginContext, disposePluginContext } from "./pluginContext";
import { safeCallPlugin, subscribePluginHMR } from "./pluginManager";
import { pluginAppended } from "./pluginStyles";
import type { PluginRendererInfo } from "@shared/plugin.types";
import type { PluginContext } from "@fainthit/repair2-plugin-sdk";

export interface PluginMountInfo {
    ctx: PluginContext;
    mount: (secondParams: Record<string, unknown>) => void | Promise<unknown>;
    unmount?: () => void;
    info: PluginRendererInfo;
}

export function subscribePluginMount({
    type,
    name,
    exportName = "default",
    contextOption = {},
    payloads = {},
    beforeMount,
    onMountReady,
    afterMount,
    onMountError,
    onUnmountError
}: {
    type: "element" | "frame";
    name: string;
    exportName?: string | null;
    beforeMount?: (api: any) => boolean;
    onMountReady?: (plugin: PluginMountInfo) => void;
    afterMount?: (plugin: PluginMountInfo) => void;
    onMountError?: (err: unknown) => void;
    onUnmountError?: (err: unknown) => void;
    contextOption: Record<string, unknown>;
    payloads: Record<string, unknown>;
}) {
    return subscribePluginHMR(type, name, exportName, ({ api, info }) => {
        if (!api || typeof api !== "function" || beforeMount?.(api) === false) return;
        const ctx = createPluginContext({
            pluginId: info.name,
            pluginType: info.type,
            ...contextOption
        });
        const plugin: PluginMountInfo = {
            ctx,
            info,
            mount: (secondParams: Record<string, unknown>) =>
                safeCallPlugin(
                    ctx,
                    "Plugin mounting failed.",
                    async () => {
                        pluginAppended(type, name);
                        const unmountCb = await api(
                            { ctx, attributes: payloads },
                            { ...secondParams }
                        );
                        plugin.unmount = () => {
                            if (typeof unmountCb === "function")
                                safeCallPlugin(
                                    ctx,
                                    "Plugin unmounting failed.",
                                    unmountCb,
                                    onUnmountError,
                                    {
                                        type: "plugin-unmount-error",
                                        phase: "mount",
                                        summary: `${name} unmounting failed`
                                    }
                                );
                            delete plugin.unmount;
                        };
                        afterMount?.(plugin);
                    },
                    (err) => {
                        disposePluginContext(ctx);
                        onMountError?.(err);
                    },
                    {
                        type: "plugin-mount-error",
                        phase: "mount",
                        summary: `${name} mounting failed`
                    }
                )
        };
        onMountReady?.(plugin);
    });
}
