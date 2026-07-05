import { Types } from "@shared/projectData/types";
import { enToKo, koToEn } from "../lib/enKoConvert";

export function process(vp: Types.ValueProcess | undefined, string: string = ""): string {
  if (vp === undefined) return string;

  if (vp.type === "replaceAll")
    return string.replaceAll(vp.payload.from ?? "", vp.payload.to ?? "");
  if (vp.type === "removeAll") return string.replaceAll(vp.payload.removing ?? "", "");
  if (vp.type === "replaceAllRegex")
    return string.replace(new RegExp(vp.payload.regex ?? "", "g"), vp.payload.to ?? "");
  if (vp.type === "toLowerCase") return string.toLowerCase();
  if (vp.type === "toUpperCase") return string.toUpperCase();
  if (vp.type === "trim") return string.trim();
  if (vp.type === "length") return String(string.length);
  if (vp.type === "enToKo") return enToKo(string);
  if (vp.type === "koToEn") return koToEn(string);
  if (vp.type === "jsFunction") {
    try {
      return new Function(
        "value",
        typeof vp.payload.scriptData === "string" ? vp.payload.scriptData : ""
      )(string);
    } catch {
      return string;
    }
  }
  return string;
}
