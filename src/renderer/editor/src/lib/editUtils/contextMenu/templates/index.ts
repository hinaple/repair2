import { typedEntries, typedFromEntries } from "@shared/utils.types";
import type { ContextMenuItems } from "../types";
import { ProjectMenu } from "./project";
import { CopyMap } from "../../clipboard/constants";
import { play } from "../../../msg";
import { getProject } from "../../../../project/store";

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

function genNodeTemplate(type: "entry" | "sequence" | "branch" | "variableSet") {
  const execute: ContextMenuItems = [
    {
      label: "실행",
      click: ({ id }) => {
        if (!id) return false;
        play.send("execute:request", { type: type === "entry" ? "entry" : "node", id });
        return true;
      }
    }
  ];
  if (type === "entry") {
    execute.push({
      label: "활성화",
      when: ({ id }) => {
        if (!id) return false;
        const node = getProject().nodes.get(id);
        return node?.nodeType === "entry" && node.standbyMode;
      },
      click: ({ id }) => {
        if (!id) return false;
        play.send("execute:request", { type: "node", id });
        return true;
      }
    });
  }
  return [...execute, { type: "separator" } as const, ...genTemplate(CopyMap[type])];
}

export const ContextMenus = typedFromEntries(
  typedEntries(CopyMap).map(([k, v]) => [
    k,
    k === "project"
      ? ProjectMenu
      : k === "entry" || k === "sequence" || k === "branch" || k === "variableSet"
        ? genNodeTemplate(k)
        : genTemplate(v)
  ])
);
