import RepairComponent from "../webcomponents/repairComponent";

const gamezone = document.getElementById("gamezone");

let components = [];

function getComponentIdxById(id) {
    return components.findIndex((c) => c.realId === id);
}
function getComponentIdx(aliasOrId) {
    return components.findIndex((c) => c.aliasOrId === aliasOrId);
}
// function findComponent(aliasOrId) {
//     return components.find((c) => c.id === aliasOrId);
// }

export function addComponent(component) {
    const idx = getComponentIdxById(component.id);
    if (idx !== -1) removeComponentByIdx(idx, false);
    const newComponent = new RepairComponent(component);
    if (newComponent.visible) gamezone.appendChild(newComponent);

    if (idx === -1) components.push(newComponent);
    else components[idx] = newComponent;
}
function removeComponentByIdx(idx, doSplice = true) {
    if (idx === -1) return;
    if (components[idx].visible) gamezone.removeChild(components[idx]);
    if (doSplice) components.splice(idx, 1);
}

export function removeComponent(alias, ignoreUnbreakable = false) {
    const idx = getComponentIdx(alias);
    if (components[idx].unbreakable && !ignoreUnbreakable) return;
    removeComponentByIdx(idx);
}
export function clearComponents(ignoreUnbreakable = false) {
    components
        .filter((c) => !c.unbreakable || !ignoreUnbreakable)
        .forEach((c, idx) => removeComponentByIdx(idx, true));
}
