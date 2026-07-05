import { genId } from "../../genId";
import type { Types } from "../types";
import { createFactory } from "./factory";

export const createListener = createFactory<Types.Listener>(
  {
    id: () => genId(),
    repeatCount: 1,
    repeatInterval: 0,
    once: false,
    global: false,
    useCapture: false,
    output: null,
    type: "custom"
  },
  "listener"
);
