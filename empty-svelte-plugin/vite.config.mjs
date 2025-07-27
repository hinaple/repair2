import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import path from "path";

export default defineConfig({
    plugins: [
        svelte(),
        cssInjectedByJsPlugin({
            injectCodeFunction: (cssCode) => {
                globalThis.InjectingCss = cssCode;
            },
            injectionCodeFormat: "es"
        })
    ],
    build: {
        lib: {
            entry: path.resolve(__dirname, "src/main.js"),
            name: "SveltePlugin",
            fileName: "plugin",
            formats: ["es"]
        },
        cssCodeSplit: true,
        outDir: "dist",
        emptyOutDir: true
    }
});
