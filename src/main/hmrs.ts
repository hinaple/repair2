import chokidar, { FSWatcher } from "chokidar";
import path, { join } from "path";
import { MANIFEST } from "./plugin/pluginManifest";
import { PLUGIN_LINK } from "./plugin/pluginLinks";

type HmrType = "css" | "plugin";

const HMR_PENDING_MS = 100;

let hmr: Hmr | null = null;
export function getHmr() {
    return hmr;
}
export function createHmr({
    onHmr,
    active = false,
    styleDir,
    pluginDir,
    dataDir
}: {
    onHmr: (data: { type: HmrType; data?: string }) => void;
    active: boolean;
    styleDir: string;
    pluginDir: string;
    dataDir: string;
}): Hmr {
    if (hmr) {
        hmr.stopWatching();
        hmr = null;
    }

    let watchers: FSWatcher[] | null = null;
    const cssPath = join(styleDir, "global.css");

    let pendingTimeouts: Map<string, NodeJS.Timeout> = new Map();

    function setActive(a: boolean) {
        if (active === a) return;

        active = a;
        if (active) startWatching();
        else stopWatching();
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
        stopWatching();
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
                }),
            chokidar.watch(join(dataDir, PLUGIN_LINK)).on("change", (p) => {
                sendHmrEvent("plugin");
                console.log("CHANGED: ", p);
            })
        ];
    }
    function stopWatching() {
        if (!watchers) return;
        watchers.forEach((w) => w.close());
        watchers = null;
        pendingTimeouts.forEach((timeout) => clearTimeout(timeout));
        pendingTimeouts.clear();
    }

    hmr = { setActive, sendHmrEvent, stopWatching };
    return hmr;
}

export type Hmr = {
    setActive: (a: boolean) => void;
    sendHmrEvent: (type: HmrType, data?: string) => void;
    stopWatching: () => void;
};
