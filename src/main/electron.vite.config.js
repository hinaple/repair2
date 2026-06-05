import { defineConfig } from "electron-vite";
import { readdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { visualizer } from "rollup-plugin-visualizer";
import pc from "picocolors";

const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));
const svelteVersion = pkg.dependencies?.svelte ?? pkg.devDependencies?.svelte ?? null;

const sdkPkg = JSON.parse(
    readFileSync(join(__dirname, "../../packages/plugin-sdk/package.json"), "utf8")
);
const sdkVersion = `^${sdkPkg.version}`;

function resolveArgv() {
    const myArgvFrom = process.argv.indexOf("--");
    if (myArgvFrom === -1) return {};

    let result = {};
    let currentKey = null;
    for (let i = myArgvFrom + 1; i < process.argv.length; i++) {
        if (process.argv[i].startsWith("--")) {
            if (currentKey) {
                result[currentKey] = true;
                currentKey = null;
            }

            if (process.argv[i].length > 2) {
                const temp = process.argv[i].substring(2);
                if (temp.includes("=")) {
                    const arr = temp.split("=");
                    result[arr[0]] = arr[1] ?? "";
                } else currentKey = temp;
            }
        } else if (currentKey) {
            result[currentKey] = process.argv[i];
            currentKey = null;
        }
    }
    if (currentKey) result[currentKey] = true;

    return result;
}
const argv = resolveArgv();

let plugins = [];

if (argv.report) {
    const suffix = typeof argv.report === "string" ? argv.report : Date.now();
    const reportFile = `report_${suffix}.html`;
    const maxReporters = typeof argv["max-report"] === "string" ? +argv["max-report"] : 5;
    const reportersDir = join(__dirname, "../../reporters");
    const reporters = readdirSync(reportersDir);
    const removingReporters = reporters
        .filter((f) => f !== reportFile)
        .sort((a, b) => b.localeCompare(a))
        .toSpliced(0, maxReporters - 1);
    for (const r of removingReporters) {
        rmSync(join(reportersDir, r), { force: true });
    }

    plugins.push(
        visualizer({
            filename: join(reportersDir, reportFile),
            template: "treemap",
            gzipSize: true,
            brotliSize: true
        })
    );

    console.log("Report file at " + pc.bgGreen(join(reportersDir, reportFile)));
}

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                plugins,
                output: {
                    manualChunks: {
                        chokidar: ["chokidar"]
                    }
                }
            }
        },
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version),
            __SVELTE_VERSION__: JSON.stringify(svelteVersion),
            __SDK_VERSION__: JSON.stringify(sdkVersion)
        }
    }
});
