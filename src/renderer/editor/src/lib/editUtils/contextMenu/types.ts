import type { FocusData } from "../focus";
import type { CopyMap } from "../clipboard/constants";
import type { MenuItem } from "../../menu/menu.types";

export type ContextMenuPosition = { x: number; y: number };

export type ContextMenuParam =
  | { type: Exclude<keyof typeof CopyMap, "project">; id: string; parents?: string[] }
  | { type: "project"; id?: undefined; parents?: undefined };

export type ContextMenuContext = ContextMenuParam & {
  position: ContextMenuPosition;
  focusData: Exclude<FocusData, { type: "nodes" }>;
};

export type ContextMenu = {
  position: ContextMenuPosition;
  items: readonly MenuItem[];
};
