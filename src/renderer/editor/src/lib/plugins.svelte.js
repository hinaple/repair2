import { ipcRenderer } from "electron";
import { showModalPromise } from "./modal/modal.svelte";
import { showToast } from "./toast/toast.svelte";
import { PLUGIN_TYPES } from "@classes/utils";

/**
 * @typedef {import("@shared/plugin.types").PluginType} PluginType
 * @typedef {import("@shared/plugin.types").PluginList} PluginList
 * @typedef {import("@shared/plugin.types").PluginRendererInfo} PluginRendererInfo
 * @typedef {import("@shared/plugin.types").PluginSingleUpdate} PluginSingleUpdate
 */

/** @type {Record<PluginType, Record<string, PluginRendererInfo>>} */
export const plugins = $state(Object.fromEntries(PLUGIN_TYPES.map((t) => [t, {}])));

export async function requestUpdatePluginList() {
    updatePlugins(await ipcRenderer.invoke("plugin:get-list"));
}
requestUpdatePluginList();

ipcRenderer.on(
    "plugin:list",
    /** @param {PluginList} p */
    (_, p) => {
        updatePlugins(p);
    }
);
ipcRenderer.on(
    "plugin:update",
    /** @param {PluginSingleUpdate} update */
    (_, update) => {
        const { info, previous } = update;
        if (previous) delete plugins[previous.type][previous.name];

        plugins[info.type][info.name] = info;
        updatePluginErrors(info);
    }
);

ipcRenderer.on(
    "plugin:hmr",
    /** @param {PluginRendererInfo} info */
    (_, info) => {
        plugins[info.type][info.name] = info;
        updatePluginErrors(info);
    }
);

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

/** @type {Map<string, import("./toast/toast.svelte").Toast>} */
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
                title: e.title,
                content: e.summary,
                duration: 0,
                closable: false
            })
        )
    );
}

ipcRenderer.on("plugin:show-create-modal", async () => {
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
    const createResult = await ipcRenderer.invoke("plugin:create", { name, type, isExternal });
    if (createResult.error) {
        showToast({
            id: "pluginCreate",
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
