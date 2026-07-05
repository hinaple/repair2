import type { Types } from "@shared/projectData/types";
import type { NodeController } from "../types";
import { ref, type Ref } from "../refs";
import { getGoto, type Goto } from "./output";
import { Base } from "../base";

export class Branch extends Base<Types.Branch> implements NodeController {
  private valueARef?: Ref<"values">;
  private valueBRef?: Ref<"values">;
  private gotoT: Goto;
  private gotoF: Goto;
  init() {
    this.valueARef = ref("values", this.d.valueA);
    this.valueBRef = ref("values", this.d.valueB);
    this.gotoT = getGoto(this.d.trueOutput);
    this.gotoF = getGoto(this.d.falseOutput);
  }
  private compare(a: string, b: string) {
    if (this.d.operator === "equals") return a == b;
    if (this.d.operator === "includes") return a.includes(b);
    if (this.d.operator === "gt") return +a > +b;
    if (this.d.operator === "lt") return +a < +b;
    if (this.d.operator === "gte") return +a >= +b;
    if (this.d.operator === "lte") return +a <= +b;
    if (this.d.operator === "jsFunction" && this.d.scriptData) {
      try {
        return new Function("valueA", "valueB", this.d.scriptData)(a, b);
      } catch (e) {
        return false;
      }
    }
    return false;
  }
  get checkCondition() {
    const valueA = this.valueARef?.();
    const valueB = this.valueBRef?.();
    return (
      valueA !== undefined &&
      valueB !== undefined &&
      this.compare(valueA.value ?? "", valueB.value ?? "")
    );
  }
  execute() {
    this.checkCondition ? this.gotoT?.() : this.gotoF?.();
  }
}
