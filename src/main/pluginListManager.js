import fs from "fs/promises";
import { join } from "path";

export function createPluginListManager(pluginDir, pluginTypes) {
    let pluginList = {};

    return {
        async ensureDirectories(extraTypes = []) {
            await fs.mkdir(pluginDir, { recursive: true });
            await Promise.all(
                [...pluginTypes, ...extraTypes].map((type) =>
                    fs.mkdir(join(pluginDir, type), { recursive: true })
                )
            );
        },
        async update() {
            console.log("Updating plugin list");
            pluginList = {};
            await Promise.all(
                pluginTypes.map(async (type) => {
                    try {
                        pluginList[type] = await fs.readdir(join(pluginDir, type));
                    } catch {
                        pluginList[type] = [];
                    }
                })
            );
            return pluginList;
        },
        get() {
            return pluginList;
        }
    };
}
