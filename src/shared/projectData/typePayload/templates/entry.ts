import { nullDefault, type TypePayloadUnion } from "./union.types";

export const EntryPayloadTemplate = {
  startup: null,
  Communication: {
    $types: true,
    Socket: {
      $types: true,
      ondata: {
        channel: nullDefault<string>(),
        data: nullDefault<string>()
      },
      connect: null
    },
    serialData: { whenDataIs: nullDefault<string>() }
  },
  shortcut: {
    ctrlKey: true,
    shiftKey: true,
    altKey: false,
    metaKey: false,
    pressingTime: 0,
    key: nullDefault<string>()
  },
  event: { channel: nullDefault<string>() }
} as const;

export type EntryTypePayload = TypePayloadUnion<typeof EntryPayloadTemplate>;
