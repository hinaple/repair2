import type { Types } from "../types";
import { createFactory } from "./factory";

export const createTransition = createFactory<Types.Transition>({
  duration: 400,
  easing: "linear",
  delay: 0,
  plugin: null
});
