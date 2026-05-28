import { type FSWatcher } from "chokidar";
import path, { join } from "path";
import { MANIFEST } from "./plugin/pluginManifest";
import { PLUGIN_LINK } from "./plugin/pluginLinks";
import chokidar from "chokidar";

type HmrType = "css" | "plugin";

const HMR_PENDING_MS = 100;

export type SetHmrActive = (active: boolean) => Promise<void[]> | void;

let hmr: SetHmrActive | null = null;
export function createHmr({
    onHmr,
    styleDir,
    pluginDir,
    dataDir
}: {
    onHmr: (data: { type: HmrType; data?: string }) => void;
    styleDir: string;
    pluginDir: string;
    dataDir: string;
}): SetHmrActive {
    if (hmr) {
        hmr(false);
        hmr = null;
    }

    let watchers: FSWatcher[] | null = null;
    const cssPath = join(styleDir, "global.css");

    let pendingTimeouts: Map<string, NodeJS.Timeout> = new Map();

    let active = false;
    let isOnlyCreated = true;
    function setActive(a: boolean) {
        if (!isOnlyCreated && active === a) return;
        isOnlyCreated = false;

        if (a) return startWatching();
        else return stopWatching();
    }
    function sendHmrEvent(type: HmrType, data?: string) {
        const key = !data ? type : `${type}:${data}`;
        const before = pendingTimeouts.get(key);
        if (before) clearTimeout(before);
        pendingTimeouts.set(
            key,
            setTimeout(() => {
                console.log(`===HMR: ${key}===`);
                onHmr({ type, data });
                pendingTimeouts.delete(key);
            }, HMR_PENDING_MS)
        );
    }
    function startWatching() {
        if (active) stopWatching();
        active = true;

        watchers = [
            chokidar.watch(cssPath).on("change", () => {
                sendHmrEvent("css");
            }),
            chokidar
                .watch(pluginDir, {
                    depth: 1,
                    cwd: pluginDir
                })
                .on("change", (p) => {
                    console.log("CHANGED: ", p);
                    const { dir, name } = path.parse(p);
                    if (name === MANIFEST) sendHmrEvent("plugin", dir);
                })
                .on("unlink", (p) => {
                    console.log("UNLINKED: ", p);
                    if (path.basename(p) !== MANIFEST) return;
                    sendHmrEvent("plugin");
                })
                .on("unlinkDir", (p) => {
                    console.log("UNLINKED DIR: ", p);
                    sendHmrEvent("plugin");
                })
                .on("addDir", (p) => {
                    console.log("ADDED DIR: ", p);
                    sendHmrEvent("plugin");
                }),
            chokidar.watch(join(dataDir, PLUGIN_LINK)).on("change", (p) => {
                sendHmrEvent("plugin");
                console.log("CHANGED: ", p);
            })
        ];
    }
    function stopWatching() {
        active = false;
        pendingTimeouts.forEach((timeout) => clearTimeout(timeout));
        pendingTimeouts.clear();
        if (!watchers) return;
        const tempWatchers = watchers;
        watchers = null;
        return Promise.all(tempWatchers.map((w) => w.close()));
    }

    hmr = setActive;
    return setActive;
}
