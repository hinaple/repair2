import type { Plugin } from "vite";
import { PluginInfo } from "./type";
import { join } from "path";
import { builtinModules } from "module";
import { is } from "@electron-toolkit/utils";
import { root } from "../dirs";

function styleInjectPlugin(pluginInfo: PluginInfo): Plugin {
    const styleKey = `${pluginInfo.type}:${pluginInfo.name}`;

    return {
        name: "repair-plugin-style-inject",
        enforce: "post",
        generateBundle(_, bundle) {
            let css = "";

            for (const [fileName, asset] of Object.entries(bundle)) {
                if (asset.type !== "asset" || !fileName.endsWith(".css")) continue;

                css += String(asset.source ?? "");
                delete bundle[fileName];
            }

            if (!css) return;

            const injectCode = `globalThis.__repairPluginRuntime?.setStyle?.(${JSON.stringify(styleKey)}, ${JSON.stringify(css)});`;

            for (const chunk of Object.values(bundle)) {
                if (chunk.type !== "chunk" || !chunk.isEntry) continue;
                chunk.code = `${injectCode}\n${chunk.code}`;
            }
        }
    };
}

const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

function isExternalImport(id: string) {
    return (
        builtins.has(id) ||
        (!id.startsWith(".") && !id.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(id))
    );
}

let cachedSveltePlugin: typeof import("@sveltejs/vite-plugin-svelte").svelte | null = null;
async function getSveltePlugin() {
    if (!cachedSveltePlugin)
        cachedSveltePlugin = (await import("@sveltejs/vite-plugin-svelte")).svelte;
    return cachedSveltePlugin;
}

type Build = typeof import("vite").build;
let _build: Build | null = null;
async function getBuild() {
    if (!_build)
        _build = (
            await import(
                /* @vite-ignore */
                is.dev
                    ? "vite"
                    : `file://${join(root, "resources/app.asar.unpacked/node_modules/vite/dist/node/index.js")}`
            )
        ).build as Build;
    return _build;
}
export async function buildPlugin(
    pluginInfo: PluginInfo,
    { pluginPath, watch = false }: { pluginPath: string; watch: boolean }
) {
    const rendererPlugins: Array<Plugin[] | Plugin> = [];

    const isFrameOrElement = pluginInfo.type === "element" || pluginInfo.type === "frame";
    if (isFrameOrElement && pluginInfo.svelte) rendererPlugins.push((await getSveltePlugin())());
    if (isFrameOrElement) rendererPlugins.push(styleInjectPlugin(pluginInfo));

    const build = await getBuild();

    const rendererBuild = build({
        configFile: false,
        root: pluginPath,
        logLevel: "error",
        plugins: rendererPlugins,
        build: {
            watch: watch ? {} : undefined,
            lib: {
                entry: pluginInfo.entry,
                formats: ["es"],
                fileName: () => "index.js"
            },
            rollupOptions: {
                output: {
                    inlineDynamicImports: true
                }
            },
            outDir: join(pluginInfo.linked ? pluginInfo.path : "", pluginInfo.outDir),
            cssCodeSplit: false,
            emptyOutDir: !watch,
            assetsInlineLimit: Infinity
        }
    });
    if (!pluginInfo.main) return [await rendererBuild];

    const mainBuild = build({
        configFile: false,
        root: pluginPath,
        logLevel: "error",
        ssr: {
            target: "node",
            external: true
        },
        build: {
            watch: watch ? {} : undefined,
            ssr: pluginInfo.main.entry,
            outDir: join(pluginInfo.linked ? pluginInfo.path : "", pluginInfo.main.outDir),
            emptyOutDir: !watch,
            rollupOptions: {
                external: isExternalImport,
                output: {
                    format: "cjs",
                    exports: "auto",
                    entryFileNames: "index.cjs"
                }
            }
        }
    });

    return Promise.all([rendererBuild, mainBuild]);
}
