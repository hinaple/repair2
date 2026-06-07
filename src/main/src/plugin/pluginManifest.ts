import fs from "fs/promises";
import { join } from "path";
import {
    ManifestCloser,
    ManifestHandler,
    ManifestWatcher,
    PLUGIN_TYPES,
    PluginManifest,
    RawManifest
} from "./type";
import type { ChokidarOptions, FSWatcher } from "chokidar";
import { logger } from "../logs/logger";

export const MANIFEST = "manifest.json";
export type ManifestReadResult =
    | { ok: true; data: RawManifest }
    | {
          ok: false;
          reason: string;
          file: string;
          detail?: string;
          error?: any;
          silent?: boolean;
          isENOENT?: boolean;
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
    if (type === "runtime") result.exports = { default: mani.attributes ?? mani.attr ?? null };
    else if (mani.exports) {
        result.exports = Array.isArray(mani.exports)
            ? Object.fromEntries(mani.exports.map((k) => [k, null]))
            : mani.exports;
    } else result.exports = { default: mani.attributes ?? mani.attr ?? null };

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
export async function getManifest(manifestPath: string): Promise<ManifestReadResult> {
    let result = "";
    try {
        result = (await fs.readFile(manifestPath, "utf8")).toString();
    } catch (error: any) {
        return {
            ok: false,
            reason: "read-failed",
            file: manifestPath,
            detail: "Manifest file could not be read",
            error,
            silent: error?.code === "ENOENT",
            isENOENT: error?.code === "ENOENT"
        };
    }

    if (!result) {
        return {
            ok: false,
            file: manifestPath,
            reason: "empty",
            detail: "Manifest file is empty"
        };
    }

    let data: any;
    try {
        data = JSON.parse(result);
    } catch (error) {
        return {
            ok: false,
            file: manifestPath,
            reason: "parse-failed",
            detail: "Manifest JSON could not be parsed",
            error
        };
    }

    if (!data?.name || !data?.type) {
        return {
            ok: false,
            file: manifestPath,
            reason: "missing-required-fields",
            detail: `Manifest requires "name" and "type"`
        };
    }

    if (!PLUGIN_TYPES.some((t) => t === data.type)) {
        return {
            ok: false,
            file: manifestPath,
            reason: "invalid-type",
            detail: `Invalid plugin type "${data.type}"`
        };
    }

    return { ok: true, data };
}

async function watch(paths: string | string[], options?: ChokidarOptions) {
    const w = (await import("chokidar")).watch;
    return w(paths, options);
}

const MANIFEST_DEBOUNCE = 200;
export async function watchManifest(
    manifestDir: string,
    callback: (type: "change" | "unlink" | "add") => void,
    closer: ManifestCloser
): Promise<ManifestWatcher> {
    let closed = false;
    const close = async () => {
        if (closed) return;

        closed = true;
        if (timeout) clearTimeout(timeout);
        closer();
        await watcher.close();
    };

    let timeout: NodeJS.Timeout | null = null;
    const watchHandler = async (type: "change" | "unlink" | "add") => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
            timeout = null;
            callback(type);
            logger.info("MANIFEST HMR", manifestDir);
        }, MANIFEST_DEBOUNCE);
    };
    const watcher = (
        await watch(join(manifestDir, MANIFEST), {
            ignoreInitial: true
        })
    )
        .on("change", () => watchHandler("change"))
        .on("unlink", () => watchHandler("unlink"))
        .on("add", () => watchHandler("add"));

    function setCallbacks(newCallback: ManifestHandler, newCloser: ManifestCloser) {
        closer();
        callback = newCallback;
        closer = newCloser;

        return myWatch;
    }
    const myWatch = { watcher, close, setCallbacks };
    return myWatch;
}
