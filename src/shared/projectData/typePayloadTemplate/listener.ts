import { nullDefault, type TypePayloadUnion } from "./union.types";

export const ListenerPayloadTemplate = {
  custom: { channel: nullDefault<string>() },
  Mouse: {
    isTypeObj: true,
    click: null, //{ doubleClick: false },
    down: null,
    up: null
  },
  // click: null,
  input: null,
  keyPress: { key: nullDefault<string>() },
  videoEnd: null,
  jsFunction: { channel: nullDefault<string>(), scriptData: nullDefault<string>() },
  Drag: {
    isTypeObj: true,
    released: { hotspotIndexes: null },
    return: null
  },
  plugin: { plugin: nullDefault<string>(), channel: nullDefault<string>() }
} as const;

export type ListenerTypePayload = TypePayloadUnion<typeof ListenerPayloadTemplate>;
