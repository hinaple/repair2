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
    removeComponentByIdx(idx, true);
    const newComponent = new RepairComponent(component, idx === -1);
    if (newComponent.visible) gamezone.appendChild(newComponent);

    if (idx === -1) components.push(newComponent);
    else components[idx] = newComponent;
}
async function removeComponentFromDOM(component, playOutro = true) {
    if (!component.visible) return;

    if (playOutro) await component.startTransition(component.outroTransition, true);
    gamezone.removeChild(component);
}
async function removeComponentByIdx(idx, willBeReplaced = false) {
    if (idx === -1) return;

    const tempComp = components[idx];
    if (!willBeReplaced) components.splice(idx, 1);

    removeComponentFromDOM(tempComp, !willBeReplaced);
}

export function removeComponentByAlias(alias, ignoreUnbreakable = false) {
    const idx = getComponentIdx(alias);
    if (!ignoreUnbreakable && components[idx]?.unbreakable) return;
    removeComponentByIdx(idx);
}
export function clearComponents(ignoreUnbreakable = false) {
    components
        .filter((c) => ignoreUnbreakable || (!c?.unbreakable && c.visible))
        .forEach((c) => removeComponentFromDOM(c));

    if (ignoreUnbreakable) components = [];
    else components = components.filter((c) => c?.unbreakable);
}
export function modifyComponentByAlias(alias, modifyKey, modifyValue) {
    const idx = getComponentIdx(alias);
    if (idx === -1) return;

    const currentComp = components[idx];
    if (modifyKey === "visible" && currentComp.visible !== modifyValue) {
        currentComp[modifyKey] = modifyValue;

        if (modifyValue) gamezone.appendChild(currentComp);
        else removeComponentFromDOM(currentComp);
        return;
    }
    if (modifyKey === "style") {
        currentComp.renderStyle(modifyValue || "");
        return;
    }
    if (modifyKey === "zIndex") {
        currentComp.setZIndex(modifyValue);
        return;
    }
    currentComp[modifyKey] = modifyValue;
}
