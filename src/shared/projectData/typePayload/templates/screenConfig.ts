import type { TypePayloadUnion } from "./union.types";

export const ScreenConfigPayloadTemplate = {
  fullscreen: null,
  fullMultiScreen: null,
  windowMode: {
    // width: null,
    // height: null,
    x: 0,
    y: 0
  }
} as const;

export type ScreenConfigTypePayload = TypePayloadUnion<typeof ScreenConfigPayloadTemplate>;
