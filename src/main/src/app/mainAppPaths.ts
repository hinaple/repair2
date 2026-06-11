import { join } from "path";
import { assetDir, dataDir, pluginDir, styleDir, templateDir, storePath } from "../system/dirs";

export const paths = {
    assetDir,
    dataDir,
    storePath,
    pluginDir,
    styleDir,
    templateDir,
    defaultProjectFile: join(templateDir, "projects/default.repair"),
    emptyProjectFile: join(templateDir, "projects/empty.repair")
} as const;
