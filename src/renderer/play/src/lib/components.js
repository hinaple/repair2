import RepairComponent from "../webcomponents/repairComponent";
import { notifyComponentSubscribers, setComponentReader } from "./componentRegistry";
import { sendChanges } from "./runtimeMonitor";

const gamezone = document.getElementById("gamezone");

let components = [];
setComponentReader(() => components);

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
    gamezone.appendChild(newComponent);

    if (idx === -1) components.push(newComponent);
    else components[idx] = newComponent;
    notifyComponentSubscribers();
    sendChanges("component", "created", component.id);
}
async function removeComponentFromDOM(component, playOutro = true) {
    if (playOutro) await component.startTransition(component.outroTransition, true);
    gamezone.removeChild(component);
}
async function removeComponentByIdx(idx, willBeReplaced = false) {
    if (idx === -1) return;

    const tempComp = components[idx];
    if (!willBeReplaced) components.splice(idx, 1);
    sendChanges("component", "removed", tempComp.realId);

    removeComponentFromDOM(tempComp, !willBeReplaced);
    if (!willBeReplaced) notifyComponentSubscribers();
}

export function removeComponentByAlias(alias, ignoreUnbreakable = false) {
    const idx = getComponentIdx(alias);
    if (!ignoreUnbreakable && components[idx]?.unbreakable) return;
    removeComponentByIdx(idx);
}
export function clearComponents(ignoreUnbreakable = false) {
    components
        .filter((c) => ignoreUnbreakable || !c?.unbreakable)
        .forEach((c) => removeComponentFromDOM(c));

    if (ignoreUnbreakable) components = [];
    else components = components.filter((c) => c?.unbreakable);
    notifyComponentSubscribers();
    sendChanges(
        "component",
        "set",
        components.map((c) => c.realId)
    );
}
export function modifyComponentByAlias(alias, modifyKey, modifyValue) {
    const idx = getComponentIdx(alias);
    if (idx === -1) return;

    const currentComp = components[idx];
    if (modifyKey === "visible" && currentComp.visible !== modifyValue) {
        currentComp.setVisible(modifyValue);
        notifyComponentSubscribers();
        return;
    }
    if (modifyKey === "style") {
        currentComp.renderStyle(modifyValue || "");
        notifyComponentSubscribers();
        return;
    }
    if (modifyKey === "zIndex") {
        currentComp.setZIndex(modifyValue);
        notifyComponentSubscribers();
        return;
    }
    currentComp[modifyKey] = modifyValue;
    notifyComponentSubscribers();
}

export function getComponents() {
    return components;
}
