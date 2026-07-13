import { get } from "svelte/store";
import { currentFocus, type FocusData } from "../focus";
import { isAbleTo } from "./utils";
import { getProject } from "../../../project/store";
import { SINGULAR_RECORD_MAP } from "@shared/constants";
import { endGroup, startGroup } from "../history";
import { ClipboardOwnMap, CONTEXT_FOCUS_TYPE_MAP } from "./constants";
import { getsetFrom, SortableUtils } from "../sortable";
import type { SatisfiedKey } from "@shared/utils.types";

export function removeData(target: FocusData = get(currentFocus), project = getProject()) {
  if (!isAbleTo("remove", target.type)) return;

  if (target.type === "nodes") {
    return project.removeManyNode([
      ...target.target.values().map((id) => project.getUnsafe("nodes", id))
    ]);
  }
  startGroup();
  try {
    const removeFrom = ClipboardOwnMap[target.type];
    if (removeFrom !== true) {
      if (!target.parents || !target.parents[0])
        throw new Error(
          `REMOVE ERROR: Parents data '${target.parents}' is invalid for removing ${target.type}:${target.target}.`
        );

      const fromType = SINGULAR_RECORD_MAP[CONTEXT_FOCUS_TYPE_MAP[removeFrom[0]]];
      const parent = project.getUnsafe(fromType, target.parents[0]);
      const getset = getsetFrom(parent, removeFrom[1] as SatisfiedKey<typeof parent, string[]>);
      const idx = getset.get().indexOf(target.target);
      if (idx === -1)
        throw new Error(
          `REMOVE ERROR: Parent ${fromType}:${target.parents[0]}.${removeFrom[1]} doesn't have ${target.target}.`
        );

      SortableUtils.removeWithHistory(getset, idx);
    }
    project.delete(SINGULAR_RECORD_MAP[target.type], target.target!);
  } finally {
    endGroup();
  }
}
