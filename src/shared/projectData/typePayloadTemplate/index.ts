import { ElementPayloadTemplate } from "./element";
import { EntryPayloadTemplate } from "./entry";
import { ListenerPayloadTemplate } from "./listener";
import { ScreenConfigPayloadTemplate } from "./screenConfig";
import { StepPayloadTemplate } from "./step";
import { ValueProcessPayloadTemplate } from "./valueProcess";

export const PayloadTemplates = {
  element: ElementPayloadTemplate,
  entry: EntryPayloadTemplate,
  listener: ListenerPayloadTemplate,
  screenConfig: ScreenConfigPayloadTemplate,
  step: StepPayloadTemplate,
  valueProcess: ValueProcessPayloadTemplate
} as const;
