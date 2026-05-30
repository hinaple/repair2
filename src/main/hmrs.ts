import { type FSWatcher } from "chokidar";
import { join } from "path";

const HMR_PENDING_MS = 100;

type HmrType = "css" | "plugin" | "links";
export type SetHmrActive = (active: boolean) => Promise<void[] | void> | null;

let hmr: SetHmrActive | null = null;
export function createHmr({
    onHmr,
    styleDir,
    pluginDir,
    dataDir
}: {
    onHmr: (type: HmrType) => void;
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
        if (!isOnlyCreated && active === a) return null;
        isOnlyCreated = false;

        if (a) return startWatching();
        else return stopWatching();
    }
    function sendHmrEvent(type: HmrType) {
        const key = type;
        const before = pendingTimeouts.get(key);
        if (before) clearTimeout(before);
        pendingTimeouts.set(
            key,
            setTimeout(() => {
                console.log(`===CHOKIDAR HMR: ${key}===`);
                onHmr(type);
                pendingTimeouts.delete(key);
            }, HMR_PENDING_MS)
        );
    }
    async function startWatching() {
        if (active) stopWatching();
        active = true;

        const watch = (await import("chokidar")).watch;

        console.log("CHOKIDAR STARTED");
        watchers = [
            watch(cssPath, {
                ignoreInitial: true
            })
                .on("change", () => {
                    console.log("CHANGED: CSS");
                    sendHmrEvent("css");
                })
                .on("unlink", () => {
                    console.log("UNLINKED: CSS");
                    sendHmrEvent("css");
                })
                .on("add", () => {
                    console.log("ADDED: CSS");
                    sendHmrEvent("css");
                }),
            watch(pluginDir, {
                depth: 0,
                cwd: pluginDir,
                ignoreInitial: true
            })
                .on("unlinkDir", (p) => {
                    console.log("UNLINKED DIR: ", p);
                    sendHmrEvent("plugin");
                })
                .on("addDir", (p) => {
                    console.log("ADDED DIR: ", p);
                    sendHmrEvent("plugin");
                })
            // chokidar
            //     .watch(join(dataDir, PLUGIN_LINK), { ignoreInitial: true })
            //     .on("change", async (p) => {
            //         console.log("CHANGED: ", p);
            //         sendHmrEvent("links");
            //     })
        ];
    }
    function stopWatching() {
        active = false;
        pendingTimeouts.forEach((timeout) => clearTimeout(timeout));
        pendingTimeouts.clear();
        if (!watchers) return null;
        const tempWatchers = watchers;
        watchers = null;
        return Promise.all(tempWatchers.map((w) => w.close()));
    }

    hmr = setActive;
    return setActive;
}
