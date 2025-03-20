// electron.vite.config.mjs
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
var electron_vite_config_default = defineConfig({
  main: {
    // plugins: [externalizeDepsPlugin()]
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
export {
  electron_vite_config_default as default
};
