import type { Types } from "../types";
import { createFactory } from "./factory";

export const createValue = createFactory<Types.Value>({
  baseType: "string",
  baseValue: null,
  process: () => []
});
