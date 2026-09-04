import { message } from "@renderer/messagePort";
import type { OnMessageFromPlay, EditorMessagePortMap } from "@renderer/messagePort/types";

export const play = message as {
  on: OnMessageFromPlay;
  send<C extends keyof EditorMessagePortMap>(channel: C, ...data: EditorMessagePortMap[C]): void;
};
