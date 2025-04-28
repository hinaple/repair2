import { getAssetDir } from "@classes/utils";
import { getAppData } from "./appdata";
import { registerUtils } from "./globalUtils";

let preloads = {};

const preloadsEl = document.getElementById("preloads");

export function genElement(resource, doClone = false, onlyNew = false) {
    if (!resource) return null;

    if (!onlyNew && preloads[resource.id]) {
        const el = preloads[resource.id].el;
        delete preloads[resource.id];

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

function addPreload(resourceId) {
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
    if (!el) return;

    // if (resource.fileType === "video") {
    //     el.muted = true;
    //     el.loop = true;
    //     el.play();
    // }
    preloadsEl.appendChild(el);
}

export function removePreload(resourceId) {
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

export function removePreloadsAll() {
    Object.keys(preloads).forEach(removePreload);
}

registerUtils("resources", {
    getElement(resourceTitle) {
        return genElement(getAppData().findResourceByTitle(resourceTitle));
    },
    addPreload(resourceTitle) {
        addPreload(getAppData().findResourceByTitle(resourceTitle).id);
    },
    removePreload(resourceTitle) {
        removePreload(getAppData().findResourceByTitle(resourceTitle).id);
    },
    getResourcePath(resourceTitle) {
        return getAssetDir(getAppData().findResourceByTitle(resourceTitle).src);
    }
});
