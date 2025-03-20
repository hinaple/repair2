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
