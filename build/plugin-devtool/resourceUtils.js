import { ipcRenderer } from "electron";
import { basename, join } from "path";

const dataDir = ipcRenderer.sendSync("getDataDir");
const assetDir = join(dataDir, "assets");

function getAssetDir(dir) {
    return join(assetDir, dir);
}

let resources = ipcRenderer.sendSync("request-data").resources;

const FileTypes = {
    image: ["jpg", "jpeg", "gif", "svg", "webp", "png", "bmp", "ico"],
    video: ["mp4", "webm", "mkv"],
    audio: ["mp3", "wav", "ogg", "m4a", "weba"],
    // script: ["js"]
};
const fileTypeMap = {};
Object.entries(FileTypes).forEach(([type, exts]) => {
    exts.forEach((e) => {
        fileTypeMap[e] = type;
    });
});

function extension(path) {
    return path ? path.split(".").pop().toLowerCase() : null;
}
function fileType(resource) {
    return fileTypeMap[extension(resource.src)] ?? null;
}

ipcRenderer.on("data", (evt, data) => {
    resources = data.resources;
});

function genElement(resource) {
    if (!resource) return;
    const type = fileType(resource);
    if (type === "image") {
        const img = document.createElement("img");
        img.src = getAssetDir(resource.src);
        return img;
    }
    if (type === "video") {
        const video = document.createElement("video");
        video.src = getAssetDir(resource.src);
        video.load();
        return video;
    }
    return null;
}

function findResourceByTitle(resourceTitle) {
    return resources.find(
        (r) =>
            (r.alias?.length ? r.alias : r.src ? basename(r.src) : null) ===
            resourceTitle
    );
}

const utils = {
    getElement(resourceTitle) {
        return genElement(findResourceByTitle(resourceTitle));
    },
    getResourcePath(resourceTitle) {
        return getAssetDir(findResourceByTitle(resourceTitle).src);
    },
};
export default utils;
