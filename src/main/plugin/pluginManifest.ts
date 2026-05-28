import fs from "fs/promises";
import { join } from "path";
import { PLUGIN_TYPES, PluginManifest, RawManifest } from "./type";

export const MANIFEST = "manifest.json";
export type ManifestReadResult =
    | { ok: true; data: RawManifest }
    | {
          ok: false;
          reason: string;
          detail?: string;
          error?: any;
          silent?: boolean;
      };

export function normalizeManifest(mani: RawManifest): PluginManifest {
    const {
        name,
        type,
        entry = mani.main ? "src/renderer/index.js" : "src/index.js",
        outDir = mani.main ? "dist/renderer/" : "dist"
    } = mani;
    const result: any = { name, type, entry, outDir };
    if (typeof mani.description === "string") result.description = mani.description;
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
    } else if ((type === "element" || type === "frame") && mani.svelte) result.svelte = true;
    return result;
}
export async function getManifest(...dirs: string[]): Promise<ManifestReadResult> {
    const manifestPath = join(...dirs, MANIFEST);
    let result = "";
    try {
        result = (await fs.readFile(manifestPath, "utf8")).toString();
    } catch (error: any) {
        return {
            ok: false,
            reason: "read-failed",
            detail: `Manifest file could not be read: ${manifestPath}`,
            error,
            silent: error?.code === "ENOENT"
        };
    }

    if (!result) {
        return {
            ok: false,
            reason: "empty",
            detail: `Manifest file is empty: ${manifestPath}`
        };
    }

    let data: any;
    try {
        data = JSON.parse(result);
    } catch (error) {
        return {
            ok: false,
            reason: "parse-failed",
            detail: `Manifest JSON could not be parsed: ${manifestPath}`,
            error
        };
    }

    if (!data?.name || !data?.type) {
        return {
            ok: false,
            reason: "missing-required-fields",
            detail: `Manifest requires "name" and "type": ${manifestPath}`
        };
    }

    if (!PLUGIN_TYPES.some((t) => t === data.type)) {
        return {
            ok: false,
            reason: "invalid-type",
            detail: `Invalid plugin type "${data.type}": ${manifestPath}`
        };
    }

    return { ok: true, data };
}
