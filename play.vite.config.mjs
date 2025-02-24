import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import renderer from "vite-plugin-electron-renderer";

export default defineConfig({
    root: "src/renderer/play",
    plugins: [svelte(), renderer()],
    server: {
        port: 3100
    },
    optimizeDeps: {
        force: true
    },
    base: "./",
    build: {
        emptyOutDir: true,
        outDir: resolve(__dirname, "out/play")
    },
    resolve: {
        alias: {
            "@classes": resolve(__dirname, "src/renderer/classes")
        }
    }
});
