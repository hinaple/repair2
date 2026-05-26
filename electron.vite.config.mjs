import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const svelteVersion = pkg.dependencies?.svelte ?? pkg.devDependencies?.svelte ?? null;

const sdkPkg = JSON.parse(readFileSync("./packages/plugin-sdk/package.json", "utf8"));
const sdkVersion = `^${sdkPkg.version}`;

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],

        define: {
            __APP_VERSION__: JSON.stringify(pkg.version),
            __SVELTE_VERSION__: JSON.stringify(svelteVersion),
            __SDK_VERSION__: JSON.stringify(sdkVersion)
        }
    }
});
