import type { MenuItem } from "../../../menu/menu.types";
import type { ContextMenuContext } from "../types";
import { createProjectMenuItems } from "./project";
import { CopyMap, type CopyMapType } from "../../clipboard/constants";
import { copy, cutData, paste, removeData } from "../../clipboard";
import { play } from "../../../msg";
import { getProject } from "../../../../project/store";
import { getOriginalPos } from "../../../../nodes/viewport";

function createClipboardMenuItems(
  context: ContextMenuContext,
  { copy: canCopy = true, remove: canRemove = true, paste: canPaste = true }: CopyMapType = {}
): MenuItem[] {
  const items: MenuItem[] = [];
  if (canCopy) {
    if (canRemove)
      items.push({
        label: "잘라내기",
        activate: () => cutData(context.focusData)
      });
    items.push({
      label: "복사",
      activate: () => copy(context.focusData)
    });
  }
  if (canPaste)
    items.push({
      label: "붙여넣기",
      activate: () =>
        paste(context.focusData, getOriginalPos(context.position.x, context.position.y))
    });
  if (canRemove)
    items.push(
      { type: "separator" },
      {
        label: "삭제",
        activate: () => removeData(context.focusData)
      }
    );

  return items;
}

function createNodeMenuItems(
  context: Exclude<ContextMenuContext, { type: "project" }>,
  type: "entry" | "sequence" | "branch" | "variableSet"
): MenuItem[] {
  const items: MenuItem[] = [
    {
      label: "실행",
      activate: () => {
        play.send("execute:request", {
          type: type === "entry" ? "entry" : "node",
          id: context.id
        });
      }
    }
  ];
  if (type === "entry") {
    const node = getProject().nodes.get(context.id);
    if (node?.nodeType === "entry" && node.standbyMode)
      items.push({
        label: "활성화",
        activate: () => {
          play.send("execute:request", { type: "node", id: context.id });
        }
      });
  }
  return items;
}

export function createContextMenuItems(context: ContextMenuContext): MenuItem[] {
  const clipboardItems = createClipboardMenuItems(context, CopyMap[context.type]);

  if (context.type === "project")
    return [...createProjectMenuItems(context), { type: "separator" }, ...clipboardItems];

  if (
    context.type === "entry" ||
    context.type === "sequence" ||
    context.type === "branch" ||
    context.type === "variableSet"
  )
    return [
      ...createNodeMenuItems(context, context.type),
      { type: "separator" },
      ...clipboardItems
    ];

  return clipboardItems;
}
