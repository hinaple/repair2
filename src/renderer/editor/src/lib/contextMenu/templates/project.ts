import { typedEntries } from "@shared/utils.types";
import { NodeLabelMap } from "../../translate";
import { createNode } from "@shared/projectData/factories";
import type { ContextMenuItems } from "../types";
import { getOriginalPos } from "../../../nodes/viewport";
import { focusData } from "../../editUtils/focus";
import { getProject } from "../../../project/store";

export const ProjectMenu: ContextMenuItems = [
  ...typedEntries(NodeLabelMap).map(([k, l]): ContextMenuItems[number] => ({
    label: `새 ${l}`,
    click: ({ pos: { x, y } }) => {
      const newNode = createNode({ nodeType: k, nodePos: getOriginalPos(x, y) });
      getProject().add("nodes", newNode);
      focusData("node", newNode.id);
      return true;
    }
  })),
  { type: "separator" },
  {
    label: "붙여넣기",
    role: "paste"
  }
] as const;
