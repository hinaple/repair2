import { basename } from "path";
import type { Types } from "./projectData/types";

const FileTypes = {
    image: ["jpg", "jpeg", "gif", "svg", "webp", "png", "bmp", "ico"],
    video: ["mp4", "webm", "mkv"],
    audio: ["mp3", "wav", "ogg", "m4a", "weba"]
    // script: ["js"]
} as const;

export type FileType = keyof typeof FileTypes;

const fileTypeMap: Record<string, FileType> = {};
Object.entries(FileTypes).forEach(([type, exts]) => {
    exts.forEach((e) => {
        fileTypeMap[e] = type as FileType;
    });
});

export function getExt(path: string | null): string | null {
    return path?.split(".").pop()?.toLowerCase() ?? null;
}
export function getFileType(ext: string | null) {
    return (ext && (fileTypeMap[ext] ?? null)) || null;
}
export function getResourceTitle(resourceData: Types.Resource) {
    return resourceData.alias?.length
        ? resourceData.alias
        : resourceData.src
          ? basename(resourceData.src)
          : null;
}
