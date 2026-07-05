import type { Types } from "@shared/projectData/types";
import { genElement } from "./resources";
import { ipc } from "./ipc";
import { coordToStyleString } from "./coord";
import { getRef } from "../project/refs";

const previewComponent = document.getElementById("preview-component")!;

interface ElementPreview {
  node: HTMLElement;
  elData: Types.Element;
  resourceId?: string;
  child?: HTMLElement;
}
let currentPreview: {
  component: Types.Component;
  elements: Map<string, Types.Element>;
} | null = null;
let els: Map<string, ElementPreview> = new Map();
ipc.on("layout-preview", (event, { component, elements }) => {
  currentPreview = { component, elements };
  render();
});
ipc.on("stop-preview", () => {
  currentPreview = null;
  previewComponent.classList.remove("show-content");
  render();
});
ipc.on("preview-content-visible", (event, visible) => {
  previewComponent.classList.toggle("show-content", visible);
});

function elStyleString(elData: Types.Element) {
  if (elData.fullscreen)
    return (
      "position: absolute;" +
      "width: var(--gamezone-width); height: var(--gamezone-height);" +
      "left: 0; top: 0;"
    );
  return (
    (elData.absolute ? `position: absolute;${coordToStyleString(elData.pos)}` : "") +
    `width: ${elData.width ? `${elData.width}px` : "auto"};` +
    `height: ${elData.height ? `${elData.height}px` : "auto"};` +
    (elData.style ?? "")
  );
}

function render() {
  if (!currentPreview) {
    els.clear();
    previewComponent.replaceChildren();
    previewComponent.setAttribute("style", "");
    previewComponent.style.display = "none";
    return;
  }

  previewComponent.style.display = "block";
  previewComponent.setAttribute(
    "style",
    coordToStyleString(currentPreview.component.pos) + (currentPreview.component.style ?? "")
  );

  if (els.size) {
    const removingElIds = new Set(els.keys());
    currentPreview.component.elements.forEach((id) => removingElIds.delete(id));
    removingElIds.forEach((i) => {
      els.get(i)?.node.remove();
      els.delete(i);
    });
  }

  currentPreview.component.elements.forEach((elId) => {
    const elData = currentPreview!.elements.get(elId);
    if (!elData) return;

    let tempEl = els.get(elId);
    if (!tempEl) {
      const node = document.createElement("div");
      node.className = "preview-element";
      previewComponent.appendChild(node);
      tempEl = {
        node,
        elData
      };
      els.set(elId, tempEl);
    } else tempEl.elData = elData;

    const currentEl: ElementPreview = tempEl!;

    if (typeof elData.className === "string" && elData.className)
      currentEl.node.className = `${elData.className} preview-element`;
    currentEl.node.setAttribute("style", elStyleString(elData));

    if ((elData.type !== "video" && elData.type !== "image") || !elData.payload.resourceId) {
      currentEl.node.replaceChildren();
      delete currentEl.resourceId;
      delete currentEl.child;
      return;
    }

    if (elData.payload.resourceId !== currentEl.resourceId) {
      currentEl.resourceId = elData.payload.resourceId;

      const resource = getRef("resources", currentEl.resourceId);

      const child =
        (resource ? genElement(resource, false, true) : null) ?? document.createElement("div");
      child.style.opacity = "0.5";
      if (elData.type === "video") {
        (child as HTMLVideoElement).controls = true;
        (child as HTMLVideoElement).muted = true;
      }

      currentEl.node.replaceChildren(child);
      currentEl.child = child;
    }

    if (!currentEl.child) return;

    currentEl.child.style.width = elData.fullscreen
      ? "var(--gamezone-width)"
      : elData.width
        ? `${elData.width}px`
        : "auto";
    currentEl.child.style.height = elData.fullscreen
      ? "var(--gamezone-height)"
      : elData.height
        ? `${elData.height}px`
        : "auto";
  });
}
