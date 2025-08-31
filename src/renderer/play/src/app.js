import Output from "@classes/output";
import Step from "@classes/step.svelte";
import Branch from "@classes/nodes/branch.svelte";
import VariableSet from "@classes/nodes/variableSet.svelte";
import ValueProcess from "@classes/value/valueProcess";

import { enToKo, koToEn } from "./lib/enKoConvert";
import { getAppData } from "./lib/appdata";
import stepExecute from "./lib/stepActions";
import { ipcRenderer } from "electron";
import { setVar } from "./lib/variables";
import "./lib/communication";
import "./lib/editorOpen";

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

VariableSet.prototype.execute = function () {
    this.output.goto();

    if (!this.variable) return;
    setVar(this.variable, this.value.value);
};

ValueProcess.prototype.process = function (before) {
    const string = before?.toString?.() ?? "";
    if (this.types[0] === "replaceAll")
        return string.replaceAll(this.payload.from, this.payload.to);
    if (this.types[0] === "removeAll") return string.replaceAll(this.payload.removing, "");
    if (this.types[0] === "replaceAllRegex")
        return string.replace(new RegExp(this.payload.regex, "g"), this.payload.to);
    if (this.types[0] === "toLowerCase") return string.toLowerCase();
    if (this.types[0] === "toUpperCase") return string.toUpperCase();
    if (this.types[0] === "trim") return string.trim();
    if (this.types[0] === "length") return string.length;
    if (this.types[0] === "enToKo") return enToKo(string);
    if (this.types[0] === "koToEn") return koToEn(string);
    if (this.types[0] === "jsFunction") {
        try {
            return new Function("value", this.payload.scriptData)(before);
        } catch {
            return string;
        }
    }
    return string;
};

window.addEventListener("load", () => {
    getAppData().executeEntry("startup");
});

ipcRenderer.on("request-execute", (event, { type, id }) => {
    if (type === "node") {
        const outputNode = getAppData().findNodeById(id);
        if (outputNode) outputNode.execute();
    }
});
