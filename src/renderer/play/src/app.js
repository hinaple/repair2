import Output from "@classes/output";
import { getAppData } from "./lib/appdata";
import Step from "@classes/step.svelte";
import stepExecute from "./lib/stepActions";
import { ipcRenderer } from "electron";
import Branch from "@classes/nodes/branch.svelte";

console.log(getAppData());

const disabledNodes = [];
Output.prototype.goto = function () {
    if (!this.to || disabledNodes.includes(this.to)) return;
    console.log("GOTO: ", this.to);
    const outputNode = getAppData().findNodeById(this.to);
    if (outputNode) outputNode.execute();
};

Step.prototype.execute = function () {
    console.log("EXECUTE: ", this);
    return stepExecute(this);
};

Branch.prototype.execute = function () {
    if (this.isTrue) {
        this.trueOutput.goto();
        if (this.disableAfterTrue) disabledNodes.push(this.id);
    } else {
        this.falseOutput.goto();
        if (this.disableAfterFalse) disabledNodes.push(this.id);
    }
};

window.addEventListener("load", () => {
    getAppData().executeEntry("start");
});

ipcRenderer.on("request-execute", (event, { type, id }) => {
    if (type === "node") {
        const outputNode = getAppData().findNodeById(id);
        if (outputNode) outputNode.execute();
    }
});
