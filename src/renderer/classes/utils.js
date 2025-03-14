import { randomBytes } from "crypto";
import { ipcRenderer } from "electron";
import { join } from "path";

let assetDir = join(ipcRenderer.sendSync("getDataDir"), "assets");

export function getAssetDir(dir) {
    return join(assetDir, dir);
}

export function genId() {
    return randomBytes(20).toString("hex");
}
