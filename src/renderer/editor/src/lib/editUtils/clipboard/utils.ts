import type { FocusData } from "../focus";
import { CopyMap, type Copiable, type CopyMapType, type Removable } from "./constants";

export function isAbleTo(toWhat: "copy", type: FocusData["type"]): type is Copiable;
export function isAbleTo(toWhat: "remove", type: FocusData["type"]): type is Removable;
export function isAbleTo(toWhat: keyof CopyMapType, type: FocusData["type"]): boolean {
  return type === "node" || type === "nodes" || (CopyMap[type] as CopyMapType)[toWhat] !== false;
}
