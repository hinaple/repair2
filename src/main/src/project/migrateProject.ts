// import semver from "semver";
import fs from "fs/promises";
import { join } from "path";
import { isDirEmpty } from "../system/pathExists";
import { ProjectData } from "@shared/projectData.types";
import { logger } from "../logs/logger";

export async function migrateProject({
    currentVersion,
    data,
    dataDir,
    pluginDir
}: {
    currentVersion: string;
    data: ProjectData | null;
    dataDir: string;
    pluginDir: string;
}) {
    if (!data) {
        logger.dialog().error("Project data is empty.");
        return;
    }
    const DataVer = data.VERSION;
    if (!DataVer) {
        if (await isDirEmpty(pluginDir)) return false;

        const OLD_PATH = join(dataDir, "plugins_old");
        await fs.rm(OLD_PATH, { recursive: true, force: true });
        await fs.rename(pluginDir, OLD_PATH);
        return true;
    }
    return false;
}
