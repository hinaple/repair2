import { genId } from "../../genId";
import type { Types } from "../types";
import { createFactory } from "./factory";

export const createStep = createFactory<Types.Step>(
  {
    id: () => genId(),
    title: null,
    type: ""
  },
  "step"
);
