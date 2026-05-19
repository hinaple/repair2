// import semver from "semver";
import fs from "fs/promises";
import { join } from "path";

export async function migrateProject({ currentVersion, data, dataDir, pluginDir }) {
    const DataVer = data.VERSION;
    if (!DataVer) {
        await fs.rename(pluginDir, join(dataDir, "plugins_old"));
        return true;
    }
    return false;
}
