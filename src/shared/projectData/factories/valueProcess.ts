import { genId } from "../../genId";
import type { Types } from "../types";
import { createFactory } from "./factory";

export const createValueProcess = createFactory<Types.ValueProcess>(
  {
    id: () => genId(),
    type: ""
  },
  "valueProcess"
);
