import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import renderer from "vite-plugin-electron-renderer";

export default defineConfig({
    root: "src/renderer/editor",
    plugins: [svelte(), renderer()],
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
            "@classes": resolve(__dirname, "src/renderer/classes")
        }
    },
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
});
