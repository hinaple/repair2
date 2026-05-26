import { randomBytes } from "crypto";
import { ipcRenderer } from "electron";
import { join } from "path";
import Sequence from "./nodes/sequence.svelte";
import Branch from "./nodes/branch.svelte";
import Entry from "./nodes/entry.svelte";
import VariableSet from "./nodes/variableSet.svelte";

export const dataDir = ipcRenderer.sendSync("getDataDir");
export const assetDir = join(dataDir, "assets");
export const pluginDir = join(dataDir, "plugins");

export function getAssetDir(dir) {
    return join(assetDir, dir);
}

export function genId(len = 20) {
    return randomBytes(len).toString("hex");
}

export const NodeClasses = {
    sequence: Sequence,
    branch: Branch,
    entry: Entry,
    variableSet: VariableSet
};

export const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"];
