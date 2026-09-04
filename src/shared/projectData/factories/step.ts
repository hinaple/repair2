import { genId } from "../../genId";
import type { Types } from "../types";
import { createTypePayloadFactory } from "./typePayloadFactory";

export const createStep = createTypePayloadFactory<Types.Step>("step")({
  id: () => genId(),
  title: null,
  type: ""
});
