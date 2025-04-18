import { randomBytes } from "crypto";
import { ipcRenderer } from "electron";
import { join } from "path";

const dataDir = ipcRenderer.sendSync("getDataDir");
const assetDir = join(dataDir, "assets");
const pluginDir = join(dataDir, "plugins");

export function getAssetDir(dir) {
    return join(assetDir, dir);
}

export function genId(len = 20) {
    return randomBytes(len).toString("hex");
}

export async function getPluginList(update = false) {
    return await ipcRenderer.sendSync("getPluginList", update);
}

export async function importPlugin(type, name) {
    return await import(
        /* @vite-ignore */
        `${join(pluginDir, type, name)}?t=${Date.now()}`
    ).then((module) => module.default);
}
export async function importAllPluginsIn(type) {
    return await Promise.all((await getPluginList())[type].map((name) => importPlugin(type, name)));
}
export async function importAllPlugins() {
    return await Promise.all(
        Object.keys(await getPluginList()).map((type) => importAllPluginsIn(type))
    );
}
