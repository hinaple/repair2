import { getAssetDir } from "@classes/utils";
import { getAppData } from "./appdata";

let preloads = {};

const preloadsEl = document.getElementById("preloads");

export function genElement(resource) {
    if (!resource) return null;

    if (preloads[resource.id]) return preloads[resource.id].el;
    if (resource.fileType === "image") {
        const img = document.createElement("img");
        img.src = getAssetDir(resource.src);
        return img;
    }
    if (resource.fileType === "video") {
        const video = document.createElement("video");
        video.src = getAssetDir(resource.src);
        video.muted = true;
        video.autoplay = false;
        return video;
    }
    return null;
}

function addPreload(resourceId) {
    if (preloads[resourceId]) return;

    const resource = getAppData().findResourceById(resourceId);
    if (!resource) return;

    preloads[resourceId] = {
        type: resource.fileType,
        src: resource.src,
        alias: resource.alias,
        el: genElement(resource)
    };
    if (preloads[resourceId].el) preloadsEl.appendChild(preloads[resourceId].el);
}

function removePreload(resourceId) {
    if (!preloads[resourceId]) return;
    if (preloads[resourceId].el) preloadsEl.removeChild(preloads[resourceId].el);
    delete preloads[resourceId];
}

export function addPreloadsBulk(resourceIds) {
    resourceIds.forEach(addPreload);
}

export function removePreloadsBulk(resourceIds) {
    resourceIds.forEach(removePreload);
}
