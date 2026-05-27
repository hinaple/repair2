import { createPluginContext, disposePluginContext } from "./pluginContext";
import { safeCallPlugin, subscribePluginHMR } from "./pluginManager";
import { pluginAppended } from "./pluginStyles";

export function subscribePluginMount({
    type,
    name,
    beforeMount = null,
    onMountReady = null,
    afterMount = null,
    onMountError = null,
    onUnmountError = null,
    contextOption = {},
    payloads = {}
}) {
    return subscribePluginHMR(type, name, ({ api, info }) => {
        if (!api || typeof api !== "function" || beforeMount?.(api) === false) return;
        const ctx = createPluginContext({
            pluginId: info.name,
            pluginType: info.type,
            ...contextOption
        });
        const mount = (secondParams) =>
            safeCallPlugin(
                ctx,
                "Plugin mounting failed.",
                async () => {
                    pluginAppended(type, name);
                    const unmountCb = await api({ ctx, attributes: payloads }, { ...secondParams });
                    plugin.unmount = () => {
                        if (typeof unmountCb === "function")
                            safeCallPlugin(
                                ctx,
                                "Plugin unmounting failed.",
                                unmountCb,
                                onUnmountError
                            );
                        plugin.unmount = null;
                    };
                    afterMount?.(plugin);
                },
                (err) => {
                    disposePluginContext(ctx);
                    onMountError?.(err);
                }
            );
        const plugin = { ctx, mount, info };
        onMountReady?.(plugin);
    });
}
