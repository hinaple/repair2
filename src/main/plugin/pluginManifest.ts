import fs from "fs/promises";
import { join } from "node:path";
import { PLUGIN_TYPES, PluginManifest, RawManifest } from "./type";

const MANIFEST = "manifest.json";

export function normalizeManifest(mani: RawManifest): PluginManifest {
    const {
        name,
        type,
        entry = mani.main ? "src/renderer/index.js" : "src/index.js",
        outDir = mani.main ? "dist/renderer/" : "dist"
    } = mani;
    const result: any = { name, type: type, entry, outDir };
    result.attributes = mani.attributes ?? mani.attr ?? [];
    if (type === "runtime") {
        let steps = mani.steps ?? {};
        if (Array.isArray(steps)) steps = Object.fromEntries(steps.map((s) => [s, null]));
        result.steps = steps;
        if (mani.main) {
            result.main = {
                entry: "src/main/index.js",
                outDir: "dist/main",
                ...mani.main
            };
        }
    }
    return result;
}
export async function getManifest(pluginDir: string, dir: string) {
    try {
        const result = (await fs.readFile(join(pluginDir, dir, MANIFEST), "utf8")).toString();
        if (!result) return false;
        const data = JSON.parse(result);
        return (
            !!(data && data.name && data.type && PLUGIN_TYPES.some((t) => t === data.type)) && data
        );
    } catch {
        return false;
    }
}
