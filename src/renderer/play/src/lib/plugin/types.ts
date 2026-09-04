import type { Types } from "@shared/projectData/types";

export type ValidPluginPointer = Omit<Types.PluginPointer, "name"> & { name: string };
