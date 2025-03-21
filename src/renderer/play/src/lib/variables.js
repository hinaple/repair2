import Value from "@classes/value/value.svelte";

let variables = {};
export default variables;

export function registerVariables(varArr) {
    variables = {};
    varArr.forEach((v) => {
        variables[v.id] = { name: v.name, value: v.defaultValue };
    });
}

export function getVar(id) {
    return variables[id]?.value;
}

export function setVar(id, value) {
    if (!variables[id]) return;
    variables[id].value = value;
}

Value.prototype.getBase = function () {
    if (this.baseType === "string") return this.baseValue;
    if (this.baseType === "variable") return getVar(this.baseValue);
    return "";
};
