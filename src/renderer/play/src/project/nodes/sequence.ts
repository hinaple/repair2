import type { Types } from "@shared/projectData/types";
import type { NodeController } from "../types";
import { type Ref, ref } from "../refs";
import { Base } from "../base";
import { getGoto } from "./output";
import { stepExecute } from "../step";

export class Sequence extends Base<Types.Sequence> implements NodeController {
  private stepRefs = this.d.steps.map((id) => ref("steps", id));
  private goto = getGoto(this.d.output);

  async execute() {
    for (const step of this.stepRefs) {
      const s = step();
      if (s && (await stepExecute(s)) === false) return;
    }
    this.goto?.();
  }
}
