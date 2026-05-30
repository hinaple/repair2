import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import renderer from "vite-plugin-electron-renderer";
import onlyBlockPlugin from "../../../vitePlugins/only-block-plugin.mjs";

export default defineConfig({
    root: "src/renderer/editor",
    cacheDir: "node_modules/.vite-editor",
    plugins: [
        onlyBlockPlugin({ target: "editor", dir: "../classes" }),
        svelte({
            onwarn: (warning, handler) => {
                if (!warning.code.startsWith("a11y") && warning.code !== "state_referenced_locally")
                    handler(warning);
            }
        }),
        renderer()
    ],
    server: {
        port: 3101
    },
    optimizeDeps: {
        force: true
    },
    base: "./",
    build: {
        emptyOutDir: true,
        outDir: resolve(__dirname, "out/editor")
    },
    resolve: {
        alias: {
            "@classes": resolve(__dirname, "../classes")
        }
    },
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
});
