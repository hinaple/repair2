import type { Types } from "../types";
import { createFactory } from "./factory";

export const createPosition = createFactory<Types.Position>({
  distance: null,
  origin: "start",
  relative: false
});
