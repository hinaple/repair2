import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { is } from "@electron-toolkit/utils";
import { app } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const userDataPath = app.getPath("userData");
export const dataDir = join(userDataPath, is.dev ? "dev_project" : "project");
export const assetDir = join(dataDir, "assets");
export const pluginDir = join(dataDir, "plugins");
export const styleDir = join(dataDir, "styles");

export const storePath = join(userDataPath, "store");

export const root = is.dev ? join(__dirname, "../..") : join(app.getPath("exe"), "..");
export const templateDir = join(root, "templates");
export const sdkDir = join(root, "packages/plugin-sdk");
