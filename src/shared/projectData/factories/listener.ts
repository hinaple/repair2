import { genId } from "../../genId";
import type { Types } from "../types";
import { createTypePayloadFactory } from "./typePayloadFactory";

export const createListener = createTypePayloadFactory<Types.Listener>("listener")({
  id: () => genId(),
  repeatCount: 1,
  repeatInterval: 0,
  once: false,
  global: false,
  useCapture: false,
  output: null,
  type: "custom"
});
