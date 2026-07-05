import type { Types } from "@shared/projectData/types";

const TypeMap: Record<string, string> = {
  keyPress: "keydown",
  globalKeyPress: "keydown",
  videoEnd: "ended",
  "Mouse.click": "click",
  "Mouse.down": "pointerdown",
  "Mouse.up": "pointerup",
  "Drag.released": "dragreleased",
  "Drag.return": "dragreturn"
};

export function getEventChannel(listener: Types.Listener) {
  return (
    (listener.payload as { channel?: string } | null)?.channel ??
    TypeMap[listener.type] ??
    listener.type.split(".").pop()
  );
}
