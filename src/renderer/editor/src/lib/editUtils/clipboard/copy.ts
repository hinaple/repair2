import { get } from "svelte/store";
import { currentFocus, type FocusData } from "../focus";
import {
  ClipboardFormat,
  CopyMap,
  type Copiable,
  type CopiedData,
  type CopyMapType
} from "./constants";
import { extractDataFrom } from "../extractData";
import type { Types } from "@shared/projectData/types";
import type { Optional } from "@shared/utils.types";
import { SINGULAR_RECORD_MAP } from "@shared/constants";
import { clipboard } from "electron";
import { pack } from "msgpackr";
import { isAbleTo } from "./utils";

export function copy(target: FocusData = get(currentFocus)) {
  const copiedData = makeCopiedData(target);
  if (!copiedData) return;

  clipboard.writeBuffer(ClipboardFormat, pack(copiedData));
}

function makeCopiedData(target: FocusData = get(currentFocus)): CopiedData | null {
  if (!isAbleTo("copy", target.type)) return null;

  const base: Optional<CopiedData, "data"> = {
    REPAIR_VERSION: __APP_VERSION__,
    type: target.type,
    owned: {}
  };
  if (target.type === "nodes") {
    const nodes: Types.Node[] = [];
    target.target.forEach((id) => {
      nodes.push(
        extractDataFrom(
          "nodes",
          id,
          {
            onlyOwns: true
          },
          base.owned
        ).source
      );
    });
    base.data = nodes;
  } else {
    base.data = extractDataFrom(
      SINGULAR_RECORD_MAP[target.type],
      target.target,
      {
        onlyOwns: true
      },
      base.owned
    ).source;
  }
  return base as CopiedData;
}
