import { message } from "@renderer/messagePort";
import type { OnMessageFromEditor, PlayMessagePortMap } from "@renderer/messagePort/types";

export const editor = message as {
  on: OnMessageFromEditor;
  send<C extends keyof PlayMessagePortMap>(channel: C, ...data: PlayMessagePortMap[C]): void;
};
