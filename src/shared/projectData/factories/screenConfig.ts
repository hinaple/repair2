import type { Types } from "../types";
import { createFactory } from "./factory";

export const createScreenConfig = createFactory<Types.ScreenConfig>(
  {
    type: "fullscreen"
  },
  "screenConfig"
);
