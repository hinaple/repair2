import { join } from "path";
import { pluginDir } from "@classes/utils";

export function dynamicImportPlugin(dir) {
    return import(
        /* @vite-ignore */
        `${join(pluginDir, dir)}?t=${Date.now()}`
    );
}
