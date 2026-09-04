import type { Types } from "@shared/projectData/types";
import type { NodeController } from "../types";
import { getGoto, type Goto } from "./output";
import { Base } from "../base";
import type { Ref } from "../refs";
import { ref } from "../refs";

export class VariableSet extends Base<Types.VariableSet> implements NodeController {
  private valueRef = ref("values", this.d.value);
  private variableRef = this.d.variable ? ref("variables", this.d.variable) : undefined;
  private goto = getGoto(this.d.output);

  execute() {
    const variable = this.variableRef?.();
    const value = this.valueRef?.();
    if (variable && value) {
      variable.set(value.value);
    }
    this.goto?.();
  }
}
