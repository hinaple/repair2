import type { FocusData } from "../focus";
import type { ContextMenus } from "./templates";

export type ContextRole = "copy" | "cut" | "paste" | "remove";

export type ContextMenuItem =
  | { type: "separator" }
  | {
      type?: "button";
      click?(menuInfo: ContextMenu): boolean | undefined;
      when?(menuInfo: ContextMenu): boolean;
      label: string;
      role?: ContextRole;
    };
export type ContextMenuItems = ContextMenuItem[];

export type ContextMenuParam =
  | { type: Exclude<keyof typeof ContextMenus, "project">; id: string; parents?: string[] }
  | { type: "project"; id?: undefined; parents?: undefined };

export type ContextMenu = ContextMenuParam & {
  pos: { x: number; y: number };
  items: ContextMenuItems;
  focusData: Exclude<FocusData, { type: "nodes" }>;
};
