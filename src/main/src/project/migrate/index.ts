// import semver from "semver";
import fs from "fs/promises";
import { join } from "path";
import { isDirEmpty } from "../../system/pathExists";
import { makeEmptyProjectData } from "./emptyProjectData";
import { logger } from "../../logs/logger";
import { migrateToV2 } from "./v2";
import type { ProjectData, V1Data } from "@shared/projectData/types";

export function migrateProject({
    appVersion,
    data
}: {
    appVersion: string;
    data: V1Data | ProjectData | null;
}): ProjectData {
    if (!data) {
        logger.dialog().warning("Project data is empty.");
        data = makeEmptyProjectData(appVersion);
    }
    if (!("version" in data)) {
        data = migrateToV2(appVersion, data);
    }

    return data;
}

export async function migratePlugins({
    appVersion,
    data,
    dataDir,
    pluginDir
}: {
    appVersion: string;
    data: ProjectData;
    dataDir: string;
    pluginDir: string;
}) {
    const AppDataVer = data.appVersion;
    if (!AppDataVer) {
        if (await isDirEmpty(pluginDir)) return false;

        const OLD_PATH = join(dataDir, "plugins_old");
        await fs.rm(OLD_PATH, { recursive: true, force: true });
        await fs.rename(pluginDir, OLD_PATH);
        return true;
    }
    return false;
}
