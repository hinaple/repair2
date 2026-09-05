import type { RepairAssetAttributes } from "@fainthit/repair2-plugin-sdk";
import type { HTMLAttributes } from "svelte/elements";

declare module "svelte/elements" {
  interface SvelteHTMLElements {
    "repair-asset": HTMLAttributes<HTMLElement> & RepairAssetAttributes;
  }
}

export {};
