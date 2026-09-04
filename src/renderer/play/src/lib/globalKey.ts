import { ipc } from "./ipc";
import type { GlobalKeyEvent } from "@shared/globalKeyEvent.types";

type Callback = (e: GlobalKeyEvent) => void;
const listeners: { keyup: Set<Callback>; keydown: Set<Callback> } = {
  keyup: new Set(),
  keydown: new Set()
};

export function addGlobalKeyEvent(type: "keydown" | "keyup", callback: Callback) {
  listeners[type].add(callback);

  return () => listeners[type].delete(callback);
}

ipc.on("global-key-event", (_, type, evt) => {
  listeners[type].forEach((c) => c(evt));
});
