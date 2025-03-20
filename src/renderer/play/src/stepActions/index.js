import componentAction from "./components";
import audioAction from "./audios";
import prelodAction from "./preloads";
import setVariableAction from "./others/setVariable";
import delayAction from "./others/delay";

export default function stepExecute(step) {
    if (step.types[0] === "Component") return componentAction(step);
    if (step.types[0] === "Audio") return audioAction(step);
    if (step.types[0] === "Preload") return prelodAction(step);

    if (step.types[0] === "setVariable") return setVariableAction(step);
    if (step.types[0] === "delay") return delayAction(step);

    return null;
}
