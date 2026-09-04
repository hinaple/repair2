import { get } from "svelte/store";
import { SINGULAR_RECORD_MAP } from "@shared/constants";
import { getMutator, getProject } from "../../../project/store";
import { currentFocus, focusData, type FocusData } from "../focus";
import { isAbleTo } from "./utils";
import { ClipboardOwnMap } from "./constants";

const ParentRecordMap = {
  sequence: "nodes",
  component: "components",
  element: "elements",
  value: "values"
} as const;

function reconcileFocusAfterRemove() {
  const focus = get(currentFocus);
  if (focus.type === "project") return;
  if (focus.type === "nodes") {
    const remaining = [...focus.target].filter((id) => getProject().nodes.has(id));
    if (remaining.length === focus.target.size) return;
    if (remaining.length) focusData("nodes", new Set(remaining));
    else focusData("project");
    return;
  }

  const type = SINGULAR_RECORD_MAP[focus.type];
  if (!getProject().get(type, focus.target)) focusData("project");
}

export function removeData(target: FocusData = get(currentFocus)) {
  if (!isAbleTo("remove", target.type)) return;
  const mutator = getMutator();

  if (target.type === "nodes") {
    mutator.transaction(() => {
      for (const id of target.target) {
        mutator.disconnectOutputsTo(id);
        if (getProject().nodes.has(id)) mutator.deleteTree("nodes", id);
      }
    });
    reconcileFocusAfterRemove();
    return;
  }
  if (target.target === null) return;
  if (!(target.type in ClipboardOwnMap)) return;

  const type = SINGULAR_RECORD_MAP[target.type];
  mutator.transaction(() => {
    const removeFrom = ClipboardOwnMap[target.type as keyof typeof ClipboardOwnMap];
    if (removeFrom !== true) {
      const parentId = target.parents?.[0];
      if (!parentId)
        throw new Error(`Parents are required to remove ${target.type}:${target.target}.`);
      const parentType = ParentRecordMap[removeFrom[0]];
      const parentEditor = mutator.record(parentType, parentId);
      const binding = parentEditor.at<string[]>(removeFrom[1]);
      const index = binding.value.indexOf(target.target);
      if (index === -1)
        throw new Error(
          `${parentType}:${parentId}.${removeFrom[1]} does not contain ${target.target}.`
        );
      binding.splice(index, 1);
    }
    if (type === "nodes") mutator.disconnectOutputsTo(target.target);
    mutator.deleteTree(type, target.target);
  });
  reconcileFocusAfterRemove();
}
