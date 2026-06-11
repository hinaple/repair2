import { showModalPromise } from "./modal/modal.svelte";
import { showToast } from "./toast/toast.svelte";
import { PLUGIN_TYPES } from "@renderer/utils";
import { ipc } from "./ipc";

/**
 * @typedef {import("@shared/plugin.types").PluginType} PluginType
 * @typedef {import("@shared/plugin.types").PluginList} PluginList
 * @typedef {import("@shared/plugin.types").PluginRendererInfo} PluginRendererInfo
 * @typedef {import("@shared/plugin.types").ManifestErrorForRenderer} ManifestErrorForRenderer
 * @typedef {import("./toast/toast.svelte").Toast} Toast
 */

/** @type {Record<PluginType, Record<string, PluginRendererInfo>>} */
export const plugins = $state(Object.fromEntries(PLUGIN_TYPES.map((t) => [t, {}])));

export function requestUpdatePlugins() {
    return Promise.all([
        ipc.invoke("plugin:get-list").then(updatePlugins),
        ipc.invoke("plugin:get-manifest-errors").then(updateManifestErrors)
    ]);
}
requestUpdatePlugins();

ipc.on("plugin:list", (_, updateData) => {
    updatePlugins(updateData.plugins);
    updateManifestErrors(updateData.manifestErrors);
});
ipc.on("plugin:update", (_, update) => {
    const { info, previous } = update;
    if (previous) delete plugins[previous.type][previous.name];

    plugins[info.type][info.name] = info;
    updatePluginErrors(info);
});
ipc.on("plugin:hmr", (_, { info }) => {
    plugins[info.type][info.name] = info;
    updatePluginErrors(info);
});
ipc.on("plugin:removed", (_, info) => {
    console.log("PLUGIN REMOVED: ", info);
    errorToasts.get(info.name)?.forEach((t) => t.destroy());
    errorToasts.delete(info.name);
    delete plugins[info.type]?.[info.name];
});
ipc.on("plugin:manifest-error", (_, manifestErrors) => updateManifestErrors(manifestErrors));

/** @param {PluginList} p */
function updatePlugins(p) {
    PLUGIN_TYPES.forEach((t) => {
        plugins[t] = {};
    });
    Object.values(p).forEach((plugin) => {
        plugins[plugin.type][plugin.name] = plugin;
        updatePluginErrors(plugin);
    });
}

/** @type {Map<string, Toast>} */
const errorToasts = new Map();
/** @param {PluginRendererInfo} plugin */
function updatePluginErrors(plugin) {
    const existing = errorToasts.get(plugin.name);
    if (existing) {
        existing.forEach((t) => t.destroy());
        errorToasts.delete(plugin.name);
    }
    if (!plugin.error) return;

    errorToasts.set(
        plugin.name,
        plugin.error.map(([p, e]) =>
            showToast({
                id: `plugin:error:${plugin.name}:${p}`,
                type: "error",
                title: `[${plugin.name}]: ${e.title}`,
                content: e.summary,
                duration: 0,
                closable: false
            })
        )
    );
}

/** @type {Map<string, Toast>} */
const manifestErrorToasts = new Map();

/** @param {ManifestErrorForRenderer[]} manifestErrors */
function updateManifestErrors(manifestErrors) {
    const removedErrors = new Set([...manifestErrorToasts.keys()]);

    manifestErrors.forEach((ME) => {
        removedErrors.delete(ME.dir);
        manifestErrorToasts.set(
            ME.dir,
            showToast({
                id: `plugin:manifest-error:${ME.dir}`,
                type: "error",
                title: ME.error,
                content: ME.manifestDir,
                duration: 0,
                closable: false
            })
        );
    });

    removedErrors.forEach((dir) => {
        manifestErrorToasts.get(dir).destroy();
        manifestErrorToasts.delete(dir);
    });
}

ipc.on("plugin:show-create-modal", async () => {
    const modalResult = await showModalPromise({
        title: "새로운 플러그인 생성",
        fields: [
            {
                label: "name",
                filter: (v) => {
                    return v
                        .toLowerCase()
                        .replace(/[^a-z0-9\-]/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-/g, "");
                },
                autofocus: true,
                required: true
            },
            {
                label: "type",
                type: "select",
                options: {
                    runtime: "runtime",
                    "runtime-with-main": "runtime(with main)",
                    element: "element",
                    "svelte-element": "element(svelte)",
                    frame: "frame",
                    "svelte-frame": "frame(svelte)",
                    function: "function",
                    transition: "transition"
                },
                value: "runtime",
                required: true
            },
            { label: "External location", type: "checkbox" }
        ],
        buttons: [{ label: "취소" }, { label: "생성" }]
    });
    if (modalResult.canceled) return;

    const {
        fields: [name, type, isExternal]
    } = modalResult;

    showToast({
        id: "pluginCreate",
        title: `Creating "${name}" plugin...`,
        duration: 0,
        closable: false
    });
    const createResult = await ipc.invoke("plugin:create", { name, type, isExternal });
    if (createResult.error) {
        showToast({
            id: "pluginCreate",
            type: "error",
            title: "An error occurred while creating plugin.",
            content: createResult.error,
            duration: 5000
        });
        return;
    } else if (createResult.canceled) return;
    showToast({
        id: "pluginCreate",
        title: `"${name}" plugin created.`,
        content: createResult.dir,
        duration: 1000
    });
});
