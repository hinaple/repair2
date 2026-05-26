// import semver from "semver";
import fs from "fs/promises";
import { join } from "path";
import { isDirEmpty, pathExists } from "./pathExists";

export async function migrateProject({ currentVersion, data, dataDir, pluginDir }) {
    const DataVer = data.VERSION;
    if (!DataVer) {
        if (isDirEmpty(pluginDir)) return false;

        const OLD_PATH = join(dataDir, "plugins_old");
        await fs.rm(OLD_PATH, { recursive: true, force: true });
        await fs.rename(pluginDir, OLD_PATH);
        return true;
    }
    return false;
}
