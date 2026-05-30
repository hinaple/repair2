import { ipcRenderer } from "electron";
import { showModalPromise } from "./modal/modal.svelte";
import { showToast } from "./toast.svelte";
import { PLUGIN_TYPES } from "@classes/utils";

export const plugins = $state(Object.fromEntries(PLUGIN_TYPES.map((t) => [t, {}])));

export async function requestUpdatePluginList() {
    updatePlugins(await ipcRenderer.invoke("plugin:get-list"));
    console.log(plugins);
}
requestUpdatePluginList();

ipcRenderer.on("plugin:list", (_, p) => {
    console.log(p);
    updatePlugins(p);
});
ipcRenderer.on("plugin:update", (_, { info, previous }) => {
    if (previous) delete plugins[previous.type][previous.name];
    console.log(info);

    plugins[info.type][info.name] = { ...info };
    if (!info.ready)
        showToast({
            title: "사용 불가능한 플러그인이 있습니다.",
            content: info.name,
            duration: 5000
        });
});
ipcRenderer.on("plugin:hmr", (_, info) => {
    if (info.error) {
        showToast({ title: `${info.name} 플러그인 오류`, content: info.error, duration: 5000 });
        return;
    } else if (!info.ready)
        showToast({
            title: "사용 불가능한 플러그인이 있습니다.",
            content: info.name,
            duration: 5000
        });
});

function updatePlugins(p) {
    PLUGIN_TYPES.forEach((t) => {
        plugins[t] = {};
    });
    let warningPlugins = [];
    Object.values(p).forEach((plugin) => {
        plugins[plugin.type][plugin.name] = plugin;
        if (!plugin.ready) warningPlugins.push(plugin.name);
    });
    if (warningPlugins.length)
        showToast({
            title: "사용 불가능한 플러그인이 있습니다.",
            content: warningPlugins.join(", "),
            duration: 5000
        });
}

ipcRenderer.on("showPluginCreateModal", async () => {
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
