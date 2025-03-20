import Output from "@classes/output";
import appdata from "./lib/appdata";
import Step from "@classes/step.svelte";
import stepExecute from "./stepActions";
import { ipcRenderer } from "electron";

console.log(appdata);

const gamezone = document.getElementById("gamezone");
gamezone.setAttribute("style", appdata.config.styleString);

Output.prototype.goto = function () {
    if (!this.to) return;
    console.log("GOTO: ", this.to);
    const outputNode = appdata.findNodeById(this.to);
    console.log(outputNode);
    if (outputNode) outputNode.execute();
};

Step.prototype.execute = function () {
    console.log("EXECUTE: ", this);
    return stepExecute(this);
};

window.addEventListener("load", () => {
    appdata.executeEntry("start");
});

ipcRenderer.on("request-execute", (event, { type, id }) => {
    if (type === "node") {
        const outputNode = appdata.findNodeById(id);
        if (outputNode) outputNode.execute();
    }
});
