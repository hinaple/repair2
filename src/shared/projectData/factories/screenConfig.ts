import type { Types } from "../types";
import { createTypePayloadFactory } from "./typePayloadFactory";

export const createScreenConfig = createTypePayloadFactory<Types.ScreenConfigData>("screenConfig")({
  type: "fullscreen"
});
