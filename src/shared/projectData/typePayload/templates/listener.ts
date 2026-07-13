import { nullDefault, owns, type TypePayloadUnion } from "./union.types";

export const ListenerPayloadTemplate = {
  custom: { channel: nullDefault<string>() },
  Mouse: {
    $types: true,
    click: null,
    down: null,
    up: null
  },
  input: null,
  keyPress: { key: nullDefault<string>() },
  videoEnd: null,
  jsFunction: { channel: nullDefault<string>(), scriptData: nullDefault<string>() },
  Drag: {
    $types: true,
    released: { hotspotIndexes: null },
    return: null
  },
  plugin: { plugin: owns("pluginPointers"), channel: nullDefault<string>() }
} as const;

export type ListenerTypePayload = TypePayloadUnion<typeof ListenerPayloadTemplate>;
