import { defineConfig } from "vite";
import { resolve } from "path";
import renderer from "vite-plugin-electron-renderer";
import vanillizer from "../../../vitePlugins/vanillizer";
import onlyBlockPlugin from "../../../vitePlugins/only-block-plugin.mjs";

export default defineConfig({
    root: "src/renderer/play",
    cacheDir: "node_modules/.vite-play",
    plugins: [onlyBlockPlugin({ target: "play", dir: "../classes" }), renderer(), vanillizer],
    server: {
        port: 3100
    },
    optimizeDeps: {
        force: true,
        exclude: ["lit"]
    },
    base: "./",
    build: {
        emptyOutDir: true,
        outDir: resolve(__dirname, "out/play")
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
