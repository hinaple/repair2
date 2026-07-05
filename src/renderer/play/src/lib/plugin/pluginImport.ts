import { join } from "path";
import { pluginDir } from "@renderer/utils";

export function dynamicImportPlugin(dir: string) {
  return import(
    /* @vite-ignore */
    `${join(pluginDir, dir)}?t=${Date.now()}`
  );
}
