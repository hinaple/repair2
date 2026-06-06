import { defineConfig } from "vite";
import { join } from "path";
import renderer from "vite-plugin-electron-renderer";
import vanillizer from "../../vitePlugins/vanillizer";
import onlyBlockPlugin from "../../vitePlugins/only-block-plugin.mjs";

const classPath = join(__dirname, "../classes");
const sharedPath = join(__dirname, "../../shared");
const outDir = join(__dirname, "../../../out/play");

export default defineConfig({
    root: __dirname,
    cacheDir: join(__dirname, "../../../node_modules/.vite-play"),
    plugins: [
        onlyBlockPlugin({ target: "play", dir: "renderer/classes/" }),
        renderer(),
        vanillizer
    ],
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
        outDir: outDir
    },
    resolve: {
        alias: {
            "@classes": classPath,
            "@shared": sharedPath
        }
    },
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
});
