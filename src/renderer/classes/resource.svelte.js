import { genId } from "./utils";
import { basename } from "path";

const FileTypes = {
    image: ["jpg", "jpeg", "gif", "svg", "webp", "png", "bmp", "ico"],
    video: ["mp4", "webm"],
    audio: ["mp3", "wav", "ogg", "m4a", "weba"],
    script: ["js"]
};
const fileTypeMap = {};
Object.entries(FileTypes).forEach(([type, exts]) => {
    exts.forEach((e) => {
        fileTypeMap[e] = type;
    });
});

export default class Resource {
    src = $state();
    alias = $state();
    folded = $state();
    constructor({ id = genId(), src = null, alias = null, folded = true } = {}) {
        this.id = id;
        this.src = src;
        this.alias = alias;
        this.folded = folded;
    }
    get extension() {
        return this.src ? this.src.split(".").pop().toLowerCase() : null;
    }
    get fileType() {
        return fileTypeMap[this.extension] ?? null;
    }
    get title() {
        return this.alias?.length ? this.alias : this.src ? basename(this.src) : "이름 없는 자원";
    }
    get storeData() {
        return {
            id: this.id,
            src: this.src,
            alias: this.alias
        };
    }
}
