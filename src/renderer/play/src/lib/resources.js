import { getAssetDir } from "@classes/utils";
import { getAppData } from "./appdata";
import { registerUtils } from "./repairUtils";
import { sendChanges } from "./runtimeMonitor";

export const preloads = {};

const preloadsEl = document.getElementById("preloads");

export function genElement(resource, doClone = false, onlyNew = false) {
    if (!resource) return null;

    if (!onlyNew && preloads[resource.id]) {
        const el = preloads[resource.id].el;
        deletePreloadData(resource.id);

        if (doClone) addPreload(resource.id);
        return el;
    }
    if (resource.fileType === "image") {
        const img = document.createElement("img");
        img.src = getAssetDir(resource.src);
        return img;
    }
    if (resource.fileType === "video") {
        const video = document.createElement("video");
        video.src = getAssetDir(resource.src);
        video.load();
        return video;
    }
    return null;
}

export function getResourceByTitle(resourceTitle) {
    return getAppData().findResourceByTitle(resourceTitle);
}

export function listResources() {
    return getAppData().resources;
}

export function getResourcePath(resource) {
    return resource ? getAssetDir(resource.src) : null;
}

export function genElementByTitle(resourceTitle) {
    return genElement(getResourceByTitle(resourceTitle));
}

export function addPreload(resourceId) {
    if (preloads[resourceId]) return;

    const resource = getAppData().findResourceById(resourceId);
    if (!resource) return;

    const el = genElement(resource, false, true);
    preloads[resourceId] = {
        type: resource.fileType,
        src: resource.src,
        alias: resource.alias,
        el
    };
    sendChanges("preload", "added", resourceId);
    if (!el) return;

    // if (resource.fileType === "video") {
    //     el.muted = true;
    //     el.loop = true;
    //     el.play();
    // }
    preloadsEl.appendChild(el);
}

export function isPreloaded(resourceId) {
    return !!preloads[resourceId];
}

function deletePreloadData(resourceId) {
    delete preloads[resourceId];
    sendChanges("preload", "released", resourceId);
}
export function removePreload(resourceId) {
    if (!preloads[resourceId]) return;
    if (preloads[resourceId].el) preloadsEl.removeChild(preloads[resourceId].el);
    deletePreloadData(resourceId);
}

export function addPreloadByTitle(resourceTitle) {
    const resource = getResourceByTitle(resourceTitle);
    if (!resource) return false;
    addPreload(resource.id);
    return true;
}

export function removePreloadByTitle(resourceTitle) {
    const resource = getResourceByTitle(resourceTitle);
    if (!resource) return false;
    removePreload(resource.id);
    return true;
}

export function getResourcePathByTitle(resourceTitle) {
    return getResourcePath(getResourceByTitle(resourceTitle));
}

export function isPreloadedByTitle(resourceTitle) {
    const resource = getResourceByTitle(resourceTitle);
    return resource ? isPreloaded(resource.id) : false;
}

export function addPreloadsBulk(resourceIds) {
    resourceIds.forEach(addPreload);
}

export function removePreloadsBulk(resourceIds) {
    resourceIds.forEach(removePreload);
}

export function removePreloadsAll() {
    Object.keys(preloads).forEach(removePreload);
}

registerUtils("resources", {
    getElement(resourceTitle) {
        return genElementByTitle(resourceTitle);
    },
    addPreload(resourceTitle) {
        addPreloadByTitle(resourceTitle);
    },
    removePreload(resourceTitle) {
        removePreloadByTitle(resourceTitle);
    },
    getResourcePath(resourceTitle) {
        return getResourcePathByTitle(resourceTitle);
    }
});
