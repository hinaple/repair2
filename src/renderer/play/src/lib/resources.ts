import { getAssetDir } from "@renderer/utils";
import { getProject } from "../project";
import { registerUtils } from "./repairUtils";
import { sendChanges } from "./runtimeMonitor";
import { registerIsPreloaded } from "../project/resource";
import { getExt, getFileType, type FileType } from "@shared/resourceUtils";
import type { Types } from "@shared/projectData/types";
import { registerPluginContextApi } from "./plugin/pluginContext";

const preloads: Map<
  string,
  {
    type: FileType;
    src: string;
    alias: string | null;
    el: HTMLVideoElement | HTMLImageElement;
  }
> = new Map();
export function getPreloads() {
  return preloads;
}

function isPreloaded(resourceId: string) {
  return !!preloads.has(resourceId);
}
registerIsPreloaded(isPreloaded);

const preloadsEl = document.getElementById("preloads")!;

export function genElement(resource: Types.Resource, doClone = false, onlyNew = false) {
  if (!resource || !resource.src) return null;

  if (!onlyNew) {
    const p = preloads.get(resource.id);

    if (p) {
      const el = p.el;
      deletePreloadData(resource.id);

      if (doClone) addPreload(resource.id);
      return el;
    }
  }

  const fileType = getFileType(getExt(resource.src));
  if (fileType === "image") {
    const img = document.createElement("img");
    img.src = getAssetDir(resource.src);
    return img;
  }
  if (fileType === "video") {
    const video = document.createElement("video");
    video.src = getAssetDir(resource.src);
    video.load();
    return video;
  }
  return null;
}

export function addPreload(resourceId: string) {
  if (preloads.has(resourceId)) return;

  const resource = getProject().data.resources.get(resourceId);
  if (!resource || !resource.src) return;

  const el = genElement(resource, false, true);
  if (!el) return;

  const type = getFileType(getExt(resource.src));
  if (!type) return;

  preloads.set(resourceId, {
    type,
    src: resource.src,
    alias: resource.alias,
    el
  });
  sendChanges("preload", "added", resourceId);
  if (!el) return;

  // if (resource.fileType === "video") {
  //     el.muted = true;
  //     el.loop = true;
  //     el.play();
  // }
  preloadsEl.appendChild(el);
}

function deletePreloadData(resourceId: string) {
  preloads.delete(resourceId);
  sendChanges("preload", "released", resourceId);
}
export function removePreload(resourceId: string) {
  const preloaded = preloads.get(resourceId);
  if (!preloaded) return;
  if (preloaded.el) preloadsEl.removeChild(preloaded.el);
  deletePreloadData(resourceId);
}

export function addPreloadsBulk(resourceIds: string[]) {
  resourceIds.forEach(addPreload);
}

export function removePreloadsBulk(resourceIds: string[]) {
  resourceIds.forEach(removePreload);
}

export function removePreloadsAll() {
  preloads.forEach((_, id) => removePreload(id));
}

export function getResourceByTitle(title: string) {
  return getProject().findResourceByTitle(title);
}

registerUtils("resources", {
  getElement(resourceTitle: string) {
    const resource = getResourceByTitle(resourceTitle);
    if (!resource) return null;

    return genElement(resource);
  },
  addPreload(resourceTitle: string) {
    const resource = getResourceByTitle(resourceTitle);
    if (!resource) return;

    addPreload(resource.id);
  },
  removePreload(resourceTitle: string) {
    const resource = getResourceByTitle(resourceTitle);
    if (!resource) return;

    removePreload(resource.id);
  },
  getResourcePath(resourceTitle: string) {
    return getResourceByTitle(resourceTitle)?.path ?? null;
  }
});
registerPluginContextApi("resource", ({ warn }) => {
  function getResource(resourceTitle: string) {
    const resource = getResourceByTitle(resourceTitle);
    if (resource) return resource;

    warn(`Resource does not exist: ${resourceTitle}`);
    return null;
  }
  return {
    list() {
      return [
        ...getProject()
          .resources.values()
          .map((r) => r.handle)
      ];
    },
    get(resourceTitle: string) {
      return getResource(resourceTitle)?.handle ?? null;
    },
    createElement(resourceTitle: string) {
      const resource = getResource(resourceTitle);
      if (!resource) return null;

      return genElement(resource);
    },
    isPreloaded(resourceTitle: string) {
      const resource = getResource(resourceTitle);
      return resource ? isPreloaded(resource.id) : false;
    },
    addPreload(resourceTitle: string) {
      const resource = getResource(resourceTitle);
      if (!resource) return;

      addPreload(resource.id);
    },
    removePreload(resourceTitle: string) {
      const resource = getResource(resourceTitle);
      if (!resource) return;

      removePreload(resource.id);
    },
    getPath(resourceTitle: string) {
      return getResource(resourceTitle)?.path ?? null;
    }
  };
});
