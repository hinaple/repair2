import fs from "fs/promises";
import { watch } from "fs";
import { join } from "path";

export function createProjectRuntimeWatchers({
    styleDir,
    pluginDir,
    // pluginTypes,
    sendToMain,
    getIsEditorOn,
    getPluginManager
    // updatePluginList
}) {
    let globalCss = "";
    const watchers = { css: null, plugins: null };
    const pluginHotReloadTimeouts = {};

    function closeAll() {
        Object.keys(watchers).forEach((key) => {
            if (!watchers[key]) return;
            watchers[key].close();
            watchers[key] = null;
        });
        console.log("All watchers closed");
    }

    async function loadGlobalCss() {
        try {
            globalCss = (await fs.readFile(join(styleDir, "global.css"))).toString();
            globalCss = globalCss.replace(/%FONTS%/g, join(styleDir, "fonts").replace(/\\/g, "/"));
            sendToMain("global-css", globalCss);
        } catch {
            globalCss = "";
        }
        return globalCss;
    }

    function watchGlobalStyles() {
        if (watchers.css) return;

        watchers.css = watch(join(styleDir, "global.css"), (eventType) => {
            if (!getIsEditorOn()) return;
            if (eventType === "change") {
                console.log("Global CSS file has changed");
                loadGlobalCss();
            }
        });
        console.log("CSS watcher activated");
    }

    function watchPlugins() {
        if (watchers.plugins) return;
        return;
        watchers.plugins = watch(pluginDir, { recursive: true }, (type, filename) => {
            if (!getIsEditorOn() || !filename) return;
            const dirs = filename.split(/\\|\//);
            if (dirs.length > 2 || !pluginTypes.includes(dirs[0])) return;

            if (type === "rename") {
                updatePluginList();
                return;
            }
            if (type !== "change") return;

            if (filename === "dependencies.json") {
                console.log("Plugin dependencies updating");
                getPluginManager()?.updateDependencies();
                return;
            }
            if (dirs.length !== 2) return;

            if (pluginHotReloadTimeouts[filename]) {
                clearTimeout(pluginHotReloadTimeouts[filename]);
            }

            pluginHotReloadTimeouts[filename] = setTimeout(() => {
                delete pluginHotReloadTimeouts[filename];
                console.log(`Plugin Editted: ${dirs[0]} - ${dirs[1]}`);

                sendToMain("plugin-hmr", {
                    type: dirs[0],
                    name: dirs[1]
                });
            }, 100);
        });
        console.log("Plugin watcher activated");
    }

    function applyDevMode(enabled) {
        if (enabled) {
            watchGlobalStyles();
            watchPlugins();
        } else if (watchers.css || watchers.plugins) {
            closeAll();
        }
    }

    return {
        applyDevMode,
        closeAll,
        loadGlobalCss,
        getGlobalCss() {
            return globalCss;
        }
    };
}
