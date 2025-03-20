import Output from "@classes/output";
import { getAppData } from "./lib/appdata";
import Step from "@classes/step.svelte";
import stepExecute from "./lib/stepActions";
import { ipcRenderer } from "electron";

console.log(getAppData());

const gamezone = document.getElementById("gamezone");
gamezone.setAttribute("style", getAppData().config.styleString);

Output.prototype.goto = function () {
    if (!this.to) return;
    console.log("GOTO: ", this.to);
    const outputNode = getAppData().findNodeById(this.to);
    console.log(outputNode);
    if (outputNode) outputNode.execute();
};

Step.prototype.execute = function () {
    console.log("EXECUTE: ", this);
    return stepExecute(this);
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
