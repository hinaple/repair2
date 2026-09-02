import { currentFocus, type FocusData } from "./focus";
import { extractDataFrom } from "./extractData";
import { play } from "../msg";
import type { MsgPreviewPayload } from "@renderer/messagePort";

let previewing: MsgPreviewPayload | null = null;

function extractPreviewData(componentId: string): MsgPreviewPayload {
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

function getPreviewData(cf: FocusData): MsgPreviewPayload | null {
  if (cf.type !== "component" && cf.type !== "element") return null;

  let componentId: string | undefined = cf.type === "component" ? cf.target : cf.parents?.[0];

  if (!componentId) return null;
  if (previewing && previewing.component.id === componentId) return previewing;

  return extractPreviewData(componentId);
}

currentFocus.subscribe((cf) => {
  const tempP = getPreviewData(cf);

  if (tempP) play.send("preview:info", tempP);
  else if (previewing) play.send("preview:stop");

  previewing = tempP;
});

export function reloadPreview() {
  if (!previewing) return;
  previewing = extractPreviewData(previewing.component.id);
  play.send("preview:info", previewing);
}

export function setPreviewContentVisible(visible: boolean) {
  if (!previewing) return;
  play.send("preview:visible", visible);
}
