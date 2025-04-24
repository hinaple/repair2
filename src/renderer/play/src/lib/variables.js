import Value from "@classes/value/value.svelte";
import { registerUtils } from "./globalUtils";

let variables = {};
export default variables;

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

export function setVar(id, value) {
    if (!variables[id]) return;
    variables[id].value = value;
    variables[id].subscriptions.forEach((c) => c(value));
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

function repairVar(name) {
    return Object.values(variables).find((v) => v.name === name);
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
