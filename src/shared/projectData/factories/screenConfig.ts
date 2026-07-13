import type { Types } from "../types";
import { createFactory } from "./factory";

export const createScreenConfig = createFactory<Types.ScreenConfigData>(
  {
    type: "fullscreen"
  },
  "screenConfig"
);
