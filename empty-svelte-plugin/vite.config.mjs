import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import path from "path";

export default defineConfig(({ command }) => ({
    plugins: [
        svelte(),
        cssInjectedByJsPlugin({
            dev: {
                enableDev: true
            },
            injectCodeFunction: (cssCode) => {
                if (!globalThis.InjectingCss) globalThis.InjectingCss = [];
                const FontFaceRegex = /(@font-face\s*{.+?})/gms;
                const fontFaces = [...cssCode.matchAll(FontFaceRegex)].map((m) => m[0]);
                globalThis.InjectingCss.push(cssCode.replace(FontFaceRegex, ""));
                const style = document.createElement("style");
                style.appendChild(document.createTextNode(fontFaces.join("\n")));
                document.head.appendChild(style);
            },
            injectionCodeFormat: "es"
        })
    ],
    ...(command === "serve"
        ? {
              //DEV
              root: path.resolve(__dirname, "_internal"),
              build: {
                  rollupOptions: {
                      input: path.resolve(__dirname, "_internal/index.html")
                  }
              }
          }
        : {
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
          })
}));
