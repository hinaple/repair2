import Value from "@classes/value/value.svelte";
import { registerUtils } from "./repairUtils";
import { sendChanges } from "./runtimeMonitor";

let variables = {};
export function getVariables() {
    return variables;
}

export function registerVariables(varArr) {
    variables = {};
    varArr.forEach((v) => {
        variables[v.id] = {
            name: v.name,
            value: v.defaultValue,
            defaultValue: v.defaultValue ?? null,
            subscriptions: []
        };
    });
}

export function getVar(id) {
    return variables[id]?.value;
}

export function getVariableIdByName(variableName) {
    return Object.entries(variables).find(([, variable]) => variable.name === variableName)?.[0] ?? null;
}

export function getVarByName(variableName) {
    const id = getVariableIdByName(variableName);
    return id ? getVar(id) : undefined;
}

export function setVar(id, value) {
    if (!variables[id]) return;
    variables[id].value = value;
    variables[id].subscriptions.forEach((c) => c(value));

    sendChanges("variable", "changed", id, value);
}

export function setVarByName(variableName, value) {
    const id = getVariableIdByName(variableName);
    if (!id) return false;
    setVar(id, value);
    return true;
}

export function resetAllVar() {
    Object.entries(variables).forEach(([id, v]) => {
        setVar(id, v.defaultValue);
    });
}

export function subscribe(id, callback) {
    if (!variables[id]) return;
    variables[id].subscriptions.push(callback);
    callback(getVar(id));
    return () => {
        variables[id].subscriptions = variables[id].subscriptions.filter((c) => c !== callback);
    };
}

export function subscribeVarByName(variableName, callback) {
    const id = getVariableIdByName(variableName);
    if (!id) return null;
    return subscribe(id, callback);
}

function repairVar(name) {
    const vId = getVariableIdByName(name);
    if (!vId) console.error("Variable named", name, "does not exist.");
    return vId;
}

registerUtils("variables", {
    get(variableName) {
        return getVar(repairVar(variableName));
    },
    set(variableName, value) {
        setVar(repairVar(variableName), value);
    },
    subscribe(variableName, callback) {
        return subscribe(repairVar(variableName), callback);
    }
});

Value.prototype.getBase = function () {
    if (this.baseType === "string") return this.baseValue;
    if (this.baseType === "variable") return getVar(this.baseValue);
    return "";
};
