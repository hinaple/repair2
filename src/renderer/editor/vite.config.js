import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { join } from "path";
import renderer from "vite-plugin-electron-renderer";
import onlyBlockPlugin from "../../vitePlugins/only-block-plugin.mjs";

const classPath = join(__dirname, "../classes");
const sharedPath = join(__dirname, "../../shared");
const outDir = join(__dirname, "../../../out/editor");
export default defineConfig({
    root: __dirname,
    cacheDir: join(__dirname, "../../../node_modules/.vite-editor"),
    plugins: [
        onlyBlockPlugin({ target: "editor", dir: "renderer/classes" }),
        svelte({
            onwarn: (warning, handler) => {
                if (!warning.code.startsWith("a11y") && warning.code !== "state_referenced_locally")
                    handler(warning);
            }
        }),
        renderer()
    ],
    server: {
        port: 3101
    },
    optimizeDeps: {
        force: true
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
