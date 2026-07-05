import type { ElementTypePayload } from "./element";
import type { EntryTypePayload } from "./entry";
import type { ListenerTypePayload } from "./listener";
import type { ScreenConfigTypePayload } from "./screenConfig";
import type { StepTypePayload } from "./step";
import type { ValueProcessTypePayload } from "./valueProcess";

export type {
  ElementTypePayload,
  EntryTypePayload,
  ListenerTypePayload,
  ScreenConfigTypePayload,
  StepTypePayload,
  ValueProcessTypePayload
};

export type TypePayloads =
  | ElementTypePayload
  | EntryTypePayload
  | ListenerTypePayload
  | ScreenConfigTypePayload
  | StepTypePayload
  | ValueProcessTypePayload;
