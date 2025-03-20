import { setVar } from "../../lib/variables";

export default function setVariable(step) {
    setVar(step.payload.variableId, step.payload.value);
    return true;
}
