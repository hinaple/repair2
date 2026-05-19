import { ipcRenderer } from "electron";

const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"];
export const plugins = $state({ plugins: Object.fromEntries(PLUGIN_TYPES.map((t) => [t, {}])) });

export async function requestUpdatePluginList() {
    plugins.plugins = await ipcRenderer.sendSync("getPluginList");
    console.log(plugins.plugins);
}
requestUpdatePluginList();

ipcRenderer.on("plugin-info", (_, plugins) => {
    plugins.plugins = plugins;
});
