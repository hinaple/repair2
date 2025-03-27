import { defineConfig } from "vite";
import { resolve } from "path";
import renderer from "vite-plugin-electron-renderer";
import vanillizer from "./vanillizer";

export default defineConfig({
    root: "src/renderer/play",
    plugins: [renderer(), vanillizer],
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
            "@classes": resolve(__dirname, "src/renderer/classes")
        }
    }
});
