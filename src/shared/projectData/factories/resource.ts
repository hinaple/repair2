import { genId } from "../../genId";
import type { Types } from "../types";
import { createFactory } from "./factory";

export const createResource = createFactory<Types.Resource>({
  id: () => genId(),
  src: null,
  alias: null
});
