import type { Types } from "@shared/projectData/types";

function posToStyleString(pos: Types.Position, isX: boolean) {
  if (pos.origin === "center") return "";

  return (
    `${pos.origin === "start" ? (isX ? "left" : "top") : isX ? "right" : "bottom"}: ` +
    `${pos.distance ?? 0}${pos.relative ? "%;" : "px;"}`
  );
}

export function coordToStyleString(coord: Types.Coord) {
  return `${posToStyleString(coord.x, true)} ${posToStyleString(coord.y, false)}`;
}
