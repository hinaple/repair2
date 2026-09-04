import type { Types } from "../types";
import { createFactory, nested } from "./factory";
import { createPosition } from "./position";

export const createCoord = createFactory<Types.Coord>({
  x: nested(createPosition),
  y: nested(createPosition)
});
