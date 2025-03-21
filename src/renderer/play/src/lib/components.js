import RepairComponent from "../webcomponents/repairComponent";

const gamezone = document.getElementById("gamezone");

let components = [];

function getDuplicatedComponentIdx(component) {
    return components.findIndex(
        (c) => c.realId === component.id || c.componentId === component.aliasOrId
    );
}
function getComponentIdx(aliasOrId) {
    return components.findIndex((c) => c.componentId === aliasOrId);
}
// function findComponent(aliasOrId) {
//     return components.find((c) => c.id === aliasOrId);
// }

export function addComponent(component) {
    const idx = getDuplicatedComponentIdx(component);
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
    if (!ignoreUnbreakable && components[idx]?.unbreakable) return;
    removeComponentByIdx(idx);
}
export function clearComponents(ignoreUnbreakable = false) {
    components
        .filter((c) => ignoreUnbreakable || (!c?.unbreakable && c.visible))
        .forEach((c) => gamezone.removeChild(c));

    if (ignoreUnbreakable) components = [];
    else components = components.filter((c) => c?.unbreakable);
}
