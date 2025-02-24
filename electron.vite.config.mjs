import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()]
    }
    // renderer: {
    //     base: "./",
    //     plugins: [svelte()],
    //     build: {
    //         outDir: "dist/renderer",
    //         rollupOptions: {
    //             input: {
    //                 editor: resolve(__dirname, "src/renderer/editor/index.html"),
    //                 play: resolve(__dirname, "src/renderer/play/index.html")
    //             }
    //         }
    //     }
    // }
});
