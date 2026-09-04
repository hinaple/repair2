import type { Types } from "@shared/projectData/types";
import { Base } from "./base";
import type { Ref } from "./refs";
import { ref } from "./refs";
import { process } from "./valueProcess";

export class Value extends Base<Types.Value> {
  private proccessRefs = this.d.process.map((id) => ref("valueProcesses", id));
  private varRef =
    this.d.baseType === "variable" && this.d.baseValue
      ? ref("variables", this.d.baseValue)
      : undefined;

  get value() {
    return this.proccessRefs.reduce(
      (result, processRef) => process(processRef(), result),
      this.baseValue
    );
  }
  get baseValue(): string {
    if (this.d.baseType === "string") return this.d.baseValue ?? "";
    if (this.d.baseType === "variable" && this.varRef) return this.varRef()?.value ?? "";
    return "";
  }
}
