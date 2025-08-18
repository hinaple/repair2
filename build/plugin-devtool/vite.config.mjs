import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import path from "path";
import { name } from "./package.json";
import renderer from "vite-plugin-electron-renderer";

export default defineConfig(({ command }) => ({
    define: {
        __PLUGIN_NAME__: JSON.stringify(name)
    },
    plugins: [
        svelte(),
        cssInjectedByJsPlugin({
            dev: {
                enableDev: true,
                removeStyleCodeFunction: (id) => {
                    if (!globalThis.InjectingCss?.[__PLUGIN_NAME__]) return;
                    globalThis.InjectingCss?.[__PLUGIN_NAME__].forEach((cssArr, where) => {
                        globalThis.InjectingCss[__PLUGIN_NAME__][where] = cssArr.filter(
                            (c) => c.attributes?.["data-vite-dev-id"] !== id
                        );
                    });
                }
            },
            ...(command === "serve"
                ? {
                      injectCodeFunction: (cssCode, option) => {
                          if (!globalThis.InjectingCss) globalThis.InjectingCss = {};
                          if (!globalThis.InjectingCss[__PLUGIN_NAME__])
                              globalThis.InjectingCss[__PLUGIN_NAME__] = [[], []]; //inner, outer

                          const cssObj = globalThis.InjectingCss[__PLUGIN_NAME__];
                          const FontFaceRegex = /(@font-face\s*{.+?})/gms;
                          const FontFaces = [...cssCode.matchAll(FontFaceRegex)].map((m) => m[0]);
                          const RemainCss = cssCode.replace(FontFaceRegex, "").trim();
                          if (RemainCss.length)
                              cssObj[0].push({
                                  css: RemainCss,
                                  attributes: option.attributes
                              });
                          if (FontFaces.length)
                              cssObj[1].push({
                                  css: FontFaces.join("\n"),
                                  attributes: option.attributes
                              });
                      },
                      injectionCodeFormat: "es"
                  }
                : {
                      injectCode: (cssCode, option) => {
                          return `
                const cssCode = ${cssCode};
                const option = ${JSON.stringify(option)};
                const pluginName = ${JSON.stringify(name)};
                if (!globalThis.InjectingCss) globalThis.InjectingCss = {};
                if (!globalThis.InjectingCss[pluginName])
                    globalThis.InjectingCss[pluginName] = [[], []]; //inner, outer

                const cssObj = globalThis.InjectingCss[pluginName];
                const FontFaceRegex = /(@font-face\s*{.+?})/gms;
                const FontFaces = [...cssCode.matchAll(FontFaceRegex)].map((m) => m[0]);
                const RemainCss = cssCode.replace(FontFaceRegex, "").trim();
                if (RemainCss.length)
                    cssObj[0].push({
                        css: RemainCss,
                        attributes: option.attributes
                    });
                if (FontFaces.length)
                    cssObj[1].push({
                        css: FontFaces.join("\\n"),
                        attributes: option.attributes
                    });
                `;
                      }
                  })
        }),
        renderer()
    ],
    resolve: {
        preserveSymlinks: true
    },
    ...(command === "serve"
        ? {
              //DEV
              build: {
                  rollupOptions: {
                      input: path.resolve(__dirname, "index.html")
                  }
              }
          }
        : {
              build: {
                  lib: {
                      entry: path.resolve(__dirname, "plugin/main.js"),
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
