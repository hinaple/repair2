import type { ContextMenus } from "./templates";

export type ContextRole = "copy" | "cut" | "paste" | "remove";

export type ContextMenuItems = (
  | { type: "separator" }
  | {
      type?: "button";
      click?(menuInfo: ContextMenu): boolean | undefined;
      label: string;
      role?: ContextRole;
    }
)[];

export type ContextMenuParam =
  | { type: "project"; id?: undefined }
  | { type: Exclude<keyof typeof ContextMenus, "project">; id: string };

export type ContextMenu = ContextMenuParam & {
  pos: { x: number; y: number };
  items: ContextMenuItems;
};
