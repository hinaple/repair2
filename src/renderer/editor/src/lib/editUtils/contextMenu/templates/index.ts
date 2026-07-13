import { typedEntries, typedFromEntries } from "@shared/utils.types";
import type { ContextMenuItems } from "../types";
import { ProjectMenu } from "./project";
import { CopyMap } from "../../clipboard/constants";

export function genTemplate({
  copy = true,
  remove = true,
  paste = true
}: { copy?: boolean; remove?: boolean; paste?: boolean } = {}) {
  const temp: ContextMenuItems = [];
  if (copy) {
    if (remove)
      temp.push({
        label: "잘라내기",
        role: "cut"
      });
    temp.push({
      label: "복사",
      role: "copy"
    });
  }
  if (paste) temp.push({ label: "붙여넣기", role: "paste" });
  if (remove)
    temp.push(
      { type: "separator" },
      {
        label: "삭제",
        role: "remove"
      }
    );

  return temp;
}

export const ContextMenus = typedFromEntries(
  typedEntries(CopyMap).map(([k, v]) => [k, k === "project" ? ProjectMenu : genTemplate(v)])
);
