import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { is } from "@electron-toolkit/utils";
import { app } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__dirname);

export const dataDir = join(app.getPath("userData"), is.dev ? "dev_project" : "project");
export const assetDir = join(dataDir, "assets");
export const pluginDir = join(dataDir, "plugins");
export const styleDir = join(dataDir, "styles");

export const templateDir = is.dev
    ? join(__dirname, "../../templates")
    : join(app.getPath("exe"), "..", "templates");
