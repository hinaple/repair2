import type { Types } from "@shared/projectData/types";
import type { NodeController } from "../types";
import { ref } from "../refs";
import { Base } from "../base";
import { getGoto } from "./output";
import { stepExecute } from "../step";

export class Sequence extends Base<Types.Sequence> implements NodeController {
  private stepRefs = this.d.steps.map((id) => ref("steps", id));
  private goto = getGoto(this.d.output);
  private runningCount = 0;

  async execute() {
    if (this.runningCount && this.d.concurrency !== "allow") return;

    this.runningCount++;
    try {
      for (const step of this.stepRefs) {
        const s = step();
        if (s && (await stepExecute(s)) === false) return;
      }
    } finally {
      this.runningCount--;
    }

    this.goto?.();
  }
}
