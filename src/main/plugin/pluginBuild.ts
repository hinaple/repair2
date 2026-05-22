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

export function buildPlugin(pluginInfo: PluginInfo, { pluginDir }: { pluginDir: string }) {
    const root = join(pluginDir, pluginInfo.path);
    const rendererBuild = build({
        configFile: false,
        root,
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
            cssCodeSplit: true,
            emptyOutDir: true,
            assetsInlineLimit: Infinity
        }
    });
    if (!pluginInfo.main) return rendererBuild;

    const mainBuild = build({
        configFile: false,
        root,
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
