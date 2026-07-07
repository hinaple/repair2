import type { Types } from "../types";
import { createFactory } from "./factory";

export const createViewportData = createFactory<Types.ViewportData>({
  size: 0,
  pos: {
    x: 0,
    y: 0
  }
});
