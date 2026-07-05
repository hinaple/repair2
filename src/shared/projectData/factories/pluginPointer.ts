import type { Types } from "../types";
import { createFactory } from "./factory";

export const createPluginPointer = createFactory<Types.PluginPointer>({
  name: null,
  exportName: "default",
  payloads: () => ({})
});
