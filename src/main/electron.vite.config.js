import { defineConfig } from "electron-vite";
import { readFileSync } from "fs";
import { join } from "path";
import { visualizer } from "rollup-plugin-visualizer";

const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));
const svelteVersion = pkg.dependencies?.svelte ?? pkg.devDependencies?.svelte ?? null;

const sdkPkg = JSON.parse(
    readFileSync(join(__dirname, "../../packages/plugin-sdk/package.json"), "utf8")
);
const sdkVersion = `^${sdkPkg.version}`;

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                plugins: [
                    visualizer({
                        filename: "reporter.html",
                        template: "treemap",
                        gzipSize: true,
                        brotliSize: true
                    })
                ],
                output: {
                    manualChunks: {
                        chokidar: ["chokidar"]
                    }
                }
            }
        },
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version),
            __SVELTE_VERSION__: JSON.stringify(svelteVersion),
            __SDK_VERSION__: JSON.stringify(sdkVersion)
        }
    }
});
