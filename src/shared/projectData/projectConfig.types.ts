import type { ScreenConfigTypePayload } from "./typePayload";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue } | undefined;

type JsonRecord = {
  [key: string]: JsonValue | undefined;
};

export type ScreenConfigStoreData = ScreenConfigTypePayload;

export type ViewportStoreData = {
  size?: number;
  pos?: {
    x: number;
    y: number;
  };
};
