import type { Types } from "@shared/projectData/types";
import type { NodeController } from "../types";
import { getGoto, type Goto } from "./output";
import { Base } from "../base";
import type { Ref } from "../refs";
import { ref } from "../refs";

export class VariableSet extends Base<Types.VariableSet> implements NodeController {
  private valueRef?: Ref<"values">;
  private variableRef?: Ref<"variables">;
  private goto?: Goto;
  init() {
    this.valueRef = ref("values", this.d.value);
    if (this.d.variable) this.variableRef = ref("variables", this.d.variable);
    this.goto = getGoto(this.d.output);
  }
  execute() {
    const variable = this.variableRef?.();
    const value = this.valueRef?.();
    if (variable && value) {
      variable.set(value.value);
    }
    this.goto?.();
  }
}
