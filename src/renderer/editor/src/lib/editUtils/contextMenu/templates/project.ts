import { typedEntries } from "@shared/utils.types";
import { NodeLabelMap } from "../../../translate";
import type { ContextMenuItems } from "../types";
import { getOriginalPos } from "../../../../nodes/viewport";
import { focusData } from "../../focus";
import { Factories } from "../../../../project/factories";

export const ProjectMenu: ContextMenuItems = [
  ...typedEntries(NodeLabelMap).map(([k, l]): ContextMenuItems[number] => ({
    label: `새 ${l}`,
    click: ({ pos: { x, y } }) => {
      const id = Factories.node[k](getOriginalPos(x, y));
      focusData("node", id);
      return true;
    }
  })),
  { type: "separator" },
  {
    label: "붙여넣기",
    role: "paste"
  }
] as const;
