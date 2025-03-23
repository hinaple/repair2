// electron.vite.config.mjs
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  }
});
export {
  electron_vite_config_default as default
};
