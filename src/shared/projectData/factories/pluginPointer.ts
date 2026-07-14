import type { Types } from "../types";
import { createFactory, createRecordFactory } from "./factory";

export const createPluginPointer = createRecordFactory(
  "pluginPointers",
  createFactory<Types.PluginPointer>()({
    name: null,
    exportName: "default",
    payloads: () => ({})
  })
);
