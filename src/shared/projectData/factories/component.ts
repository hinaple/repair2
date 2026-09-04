import { genId } from "../../genId";
import type { Types } from "../types";
import { createCoord } from "./coord";
import { createFactory, createRecordFactory, nested, owns } from "./factory";
import { createPluginPointer } from "./pluginPointer";
import { createTransition } from "./transition";

export const createComponent = createRecordFactory(
  "components",
  createFactory<Types.Component>()({
    id: () => genId(),
    alias: null,
    elements: () => [],
    pos: nested(createCoord),
    zIndex: null,
    unbreakable: false,
    visible: true,
    style: null,
    frame: owns(createPluginPointer),
    introTransition: nested(createTransition),
    outroTransition: nested(createTransition)
  })
);
