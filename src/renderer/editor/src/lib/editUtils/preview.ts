import type { IpcPreviewPayload } from "@shared/ipc.types";
import { ipc } from "../ipc";
import { currentFocus, type FocusData } from "./focus";
import { extractDataFrom } from "./extractData";

let previewing: IpcPreviewPayload | null = null;

function getPreviewData(cf: FocusData): IpcPreviewPayload | null {
  if (cf.type !== "component" && cf.type !== "element") return null;

  let componentId: string | undefined = cf.type === "component" ? cf.target : cf.parents?.[0];

  if (!componentId) return null;
  if (previewing && previewing.component.id === componentId) return previewing;

  const {
    source: component,
    result: { elements }
  } = extractDataFrom("components", componentId, {
    includes: ["elements"],
    maxLevel: 1,
    onlyOwns: true
  });

  return { component, elements: elements || new Map() };
}

currentFocus.subscribe((cf) => {
  const tempP = getPreviewData(cf);

  if (tempP) ipc.send("layout-preview", tempP);
  else if (previewing) ipc.send("stop-preview");

  previewing = tempP;
});

export function reloadPreview() {
  if (!previewing) return;
  ipc.send("layout-preview", previewing);
}

export function setPreviewContentVisible(visible: boolean) {
  if (!previewing) return;
  ipc.send("preview-content-visible", visible);
}
