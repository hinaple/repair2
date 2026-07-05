// import semver from "semver";
import fs from "fs/promises";
import { join } from "path";
import { isDirEmpty } from "../../system/pathExists";
import { makeEmptyProjectData } from "./emptyProjectData";
import { logger } from "../../logs/logger";
import { migrateToV2 } from "./v2";
import type { PossibleStoredData, StoredProjectData } from "@shared/projectData/types";

export function migrateProject({
  appVersion,
  data
}: {
  appVersion: string;
  data: PossibleStoredData;
}): StoredProjectData {
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
  projectAppVer,
  dataDir,
  pluginDir
}: {
  appVersion: string;
  projectAppVer: string | null;
  dataDir: string;
  pluginDir: string;
}) {
  if (!projectAppVer) {
    if (await isDirEmpty(pluginDir)) return false;

    const OLD_PATH = join(dataDir, "plugins_old");
    await fs.rm(OLD_PATH, { recursive: true, force: true });
    await fs.rename(pluginDir, OLD_PATH);
    return true;
  }
  return false;
}
