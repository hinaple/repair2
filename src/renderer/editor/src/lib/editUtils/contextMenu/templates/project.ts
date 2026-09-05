import { typedEntries } from "@shared/utils.types";
import { NodeLabelMap } from "../../../translate";
import type { MenuItem } from "../../../menu/menu.types";
import type { ContextMenuContext } from "../types";
import { getOriginalPos } from "../../../../nodes/viewport";
import { focusData } from "../../focus";
import { Factories } from "../../../../project/factories";

export function createProjectMenuItems(context: ContextMenuContext): MenuItem[] {
  return typedEntries(NodeLabelMap).map(([k, l]): MenuItem => ({
    label: `새 ${l}`,
    activate: () => {
      const id = Factories.node[k](getOriginalPos(context.position.x, context.position.y));
      focusData("node", id);
    }
  }));
}
