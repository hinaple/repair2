import { ipcRenderer } from "electron";
import { join } from "path";
import Sequence from "./classes/nodes/sequence.svelte";
import Branch from "./classes/nodes/branch.svelte";
import Entry from "./classes/nodes/entry.svelte";
import VariableSet from "./classes/nodes/variableSet.svelte";

export const dataDir = ipcRenderer.sendSync("getDataDir");
export const assetDir = join(dataDir, "assets");
export const pluginDir = join(dataDir, "plugins");

export function getAssetDir(dir) {
    return join(assetDir, dir);
}

export const NodeClasses = {
    sequence: Sequence,
    branch: Branch,
    entry: Entry,
    variableSet: VariableSet
};

export const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"];
