import { addPreloadsBulk } from "../../lib/resources";

export default function prelodAction(step) {
    if (step.types[1] === "add") addPreloadsBulk(step.payload.resourceArr);
}
