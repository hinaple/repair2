import { genId } from "../../genId";
import type { Types } from "../types";
import { createFactory } from "./factory";

export const createVariable = createFactory<Types.Variable>({
  id: () => genId(),
  name: null,
  defaultValue: null
});
