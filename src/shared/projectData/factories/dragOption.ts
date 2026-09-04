import type { Types } from "../types";
import { createCoord } from "./coord";

export function createDragOption(overrides: Partial<Types.DragOption> = {}): Types.DragOption {
  if (!overrides.use) return { use: false };
  const { hotspots, ...rest } = overrides;

  return {
    use: true,
    returnOnRelease: false,
    returnDuration: 0,
    threshold: 0,
    snapOn: "drag",
    snapDuration: 100,
    moveEasing: "easeOutSine",
    ...rest,
    hotspots: hotspots?.map((hotspot) => createCoord(hotspot)) ?? []
  };
}
