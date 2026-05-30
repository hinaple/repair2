import type { Plugin } from "vite";
import { PluginInfo } from "./type";
import { is } from "@electron-toolkit/utils";
import { dirname, posix, join } from "node:path";
import { builtinModules } from "node:module";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

if (!is.dev) {
    // patch spawn() to fix esbuild EPIPE error
    const originalSpawn = childProcess.spawn;
    childProcess.spawn = function patchedSpawn(command: string, ...params: any): any {
        if (typeof command === "string" && command.toLowerCase().endsWith("esbuild.exe"))
            command = command.replace("app.asar", "app.asar.unpacked");
        //@ts-ignore
        return originalSpawn(command, ...params);
    };
}

let svResolver: null | false | Plugin = null;
let creatingSvResolver: null | undefined | Promise<Plugin | null>;
function getSvelteResolvePlugin(): null | Plugin | Promise<Plugin | null> {
    if (svResolver === false) return null;
    if (svResolver) return svResolver;
    if (creatingSvResolver) return creatingSvResolver;

    creatingSvResolver = (async () => {
        try {
            const sveltePkgPath = fileURLToPath(await import.meta.resolve("svelte/package.json"));
            const svelteDir = dirname(sveltePkgPath);
            const exports = JSON.parse(await readFile(sveltePkgPath, "utf8")).exports;
            const svMap = new Map(
                Object.entries(exports).map(([from, to]: [string, any]) => [
                    posix.join("svelte", from),
                    join(
                        svelteDir,
                        typeof to === "string" ? to : (to.browser ?? to.default ?? from)
                    )
                ])
            );
            if (!svMap) {
                svResolver = false;
                return null;
            }

            svResolver = {
                name: "repair-svelte-resolve",
                enforce: "pre",
                async resolveId(source) {
                    if (source !== "svelte" && !source.startsWith("svelte/")) return null;
                    // console.log(`${source} -> ${svMap.get(source)}`);
                    return svMap.get(source) ?? null;
                }
            };
            return svResolver;
        } catch (err) {
            console.error("An error occurred while creating svelte exports map");
            console.error(err);
            svResolver = false;
            return null;
        } finally {
            creatingSvResolver = null;
        }
    })();
    return creatingSvResolver;
}

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
    if (!_build) _build = (await import("vite")).build as Build;
    return _build;
}
export async function buildPlugin(
    pluginInfo: PluginInfo,
    { pluginPath, watch = false }: { pluginPath: string; watch: boolean }
) {
    const rendererPlugins: Array<Plugin[] | Plugin> = [];

    const isFrameOrElement = pluginInfo.type === "element" || pluginInfo.type === "frame";
    if (isFrameOrElement && pluginInfo.svelte) {
        const svResolver = await getSvelteResolvePlugin();
        if (svResolver) rendererPlugins.push(svResolver);
        rendererPlugins.push((await getSveltePlugin())());
    }
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
