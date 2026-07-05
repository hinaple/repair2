import { genId } from "../../genId";
import type { Types } from "../types";
import { createCoord } from "./coord";
import { createDragOption } from "./dragOption";
import { createFactory, nested } from "./factory";

export const createElement = createFactory<Types.Element>(
  {
    id: () => genId(),
    alias: null,
    width: null,
    height: null,
    style: null,
    childStyle: null,
    className: null,
    pos: nested(createCoord),
    absolute: false,
    fullscreen: false,
    listeners: () => [],
    dragOption: nested<Types.DragOption>(createDragOption),
    type: "empty"
  },
  "element"
);
