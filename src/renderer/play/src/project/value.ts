import { Types } from "@shared/projectData/types";
import { Base } from "./base";
import { Ref, ref } from "./refs";
import { process } from "./valueProcess";

export class Value extends Base<Types.Value> {
    private proccessRefs: Ref<"valueProcesses">[] = [];
    private getVar?: () => string;
    init() {
        this.proccessRefs = this.d.process.map((id) => ref("valueProcesses", id));
        if (this.d.baseType === "variable" && this.d.baseValue) {
            const r = ref("variables", this.d.baseValue);
            this.getVar = () => r()?.value ?? "";
        }
    }
    get value() {
        return this.proccessRefs.reduce(
            (result, processRef) => process(processRef(), result),
            this.baseValue
        );
    }
    get baseValue(): string {
        if (this.d.baseType === "string") return this.d.baseValue ?? "";
        if (this.d.baseType === "variable" && this.getVar) return this.getVar();
        return "";
    }
}
