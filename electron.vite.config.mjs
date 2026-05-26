import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const svelteVersion = pkg.dependencies?.svelte ?? pkg.devDependencies?.svelte ?? null;

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],

        define: {
            __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
            __SVELTE_VERSION__: JSON.stringify(svelteVersion)
        }
    }
});
