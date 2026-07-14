import type { Types } from "../types";
import { createFactory, createRecordFactory } from "./factory";

export const createValue = createRecordFactory(
  "values",
  createFactory<Types.Value>({
    baseType: "string",
    baseValue: null,
    process: () => []
  })
);
