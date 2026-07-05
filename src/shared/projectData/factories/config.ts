import type { Types } from "../types";
import { createFactory, nested } from "./factory";
import { createScreenConfig } from "./screenConfig";

export const createConfig = createFactory<Types.ProjectConfig>({
  title: "REPAIR v2",
  width: null,
  height: null,
  sizeRatio: 1,
  filter: null,
  style: null,
  editorShortcut: "E",
  editorPassword: null,
  screenConfig: nested(createScreenConfig),
  transparent: false,
  devMode: false,
  alwaysOnTop: false,
  suppressGlobalKeys: false,
  runtimePlugins: () => []
});
