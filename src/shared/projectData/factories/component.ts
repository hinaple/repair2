import { genId } from "../../genId";
import type { Types } from "../types";
import { createCoord } from "./coord";
import { createFactory, nested } from "./factory";
import { createTransition } from "./transition";

export const createComponent = createFactory<Types.Component>({
  id: () => genId(),
  alias: null,
  elements: () => [],
  pos: nested(createCoord),
  zIndex: null,
  unbreakable: false,
  visible: true,
  style: null,
  frame: "",
  introTransition: nested(createTransition),
  outroTransition: nested(createTransition)
});
