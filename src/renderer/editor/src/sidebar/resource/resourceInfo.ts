import type { Types } from "@shared/projectData/types";

const FileTypeByExtension: Record<string, "image" | "video" | "audio" | "script" | "other"> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  mp4: "video",
  webm: "video",
  mov: "video",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  js: "script",
  mjs: "script",
  cjs: "script"
};

export function getResourceInfo(resource: Types.Resource) {
  const src = resource.src ?? "";
  const fileName = src.split(/[\\/]/).at(-1) || "선택된 파일 없음";
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? "";
  return {
    ...resource,
    title: resource.alias || fileName,
    fileType: FileTypeByExtension[extension] ?? "other"
  };
}
