import { build } from "vite";
import { PluginInfo } from "./type";
import { join } from "path";
import { builtinModules } from "module";

const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

function isExternalImport(id: string) {
    return (
        builtins.has(id) ||
        (!id.startsWith(".") && !id.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(id))
    );
}

async function getSveltePlugin() {
    const { svelte } = await import("@sveltejs/vite-plugin-svelte");
    return svelte;
}

export function buildPlugin(pluginInfo: PluginInfo, { pluginPath }: { pluginPath: string }) {
    const rendererBuild = build({
        configFile: false,
        root: pluginPath,
        build: {
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
            outDir: pluginInfo.outDir,
            cssCodeSplit: false,
            emptyOutDir: true,
            assetsInlineLimit: Infinity
        }
    });
    if (!pluginInfo.main) return rendererBuild;

    const mainBuild = build({
        configFile: false,
        root: pluginPath,
        ssr: {
            target: "node",
            external: true
        },
        build: {
            ssr: pluginInfo.main.entry,
            outDir: pluginInfo.main.outDir,
            emptyOutDir: true,
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
