import RepairComponent from "../webcomponents/repairComponent";
import { reportPluginException } from "./plugin/pluginReporter";
import { sendChanges } from "./runtimeMonitor";

const gamezone = document.getElementById("gamezone");

/** @type {Set<RepairComponent>} */
let components = new Set();

const subscribers = new Set();

function getDuplicatedComponent(component) {
    return components
        .values()
        .find((c) => c.realId === component.id || c.componentId === component.aliasOrId);
}
export function getComponent(aliasOrId) {
    return components.values().find((c) => c.componentId === aliasOrId);
}

export function addComponent(component) {
    const duplicatedComp = getDuplicatedComponent(component);
    removeComponent(duplicatedComp, true);
    const newComponent = new RepairComponent(component, !duplicatedComp);
    gamezone.appendChild(newComponent);

    components.add(newComponent);
    notifyComponentSubscribers();
    sendChanges("component", "created", component.id);
}
export async function removeComponent(component, playOutro = false, noNotify = false) {
    if (!component) return;

    components.delete(component);
    sendChanges("component", "removed", component.realId);
    if (!noNotify) notifyComponentSubscribers();

    if (!playOutro) await component.startTransition(component.outroTransition, true);
    gamezone.removeChild(component);
}

export function removeComponentByAlias(alias, ignoreUnbreakable = false) {
    const component = getComponent(alias);
    if (!component || (!ignoreUnbreakable && component?.unbreakable)) return;
    removeComponent(component);
}
export function clearComponents(ignoreUnbreakable = false) {
    components.forEach((c) => {
        if (!ignoreUnbreakable && c?.unbreakable) return;
        removeComponent(c, false, true);
        components.delete(c);
    });
    notifyComponentSubscribers();
    sendChanges("component", "set", [...components.values().map((c) => c.realId)]);
}
export function modifyComponentByAlias(alias, modifyKey, modifyValue) {
    const component = getComponent(alias);
    if (!component) return;

    if (modifyKey === "visible") component.setVisible(modifyValue);
    else if (modifyKey === "style") component.renderStyle(modifyValue || "");
    else if (modifyKey === "zIndex") component.setZIndex(modifyValue);
    else if (modifyKey === "position") component.setPosition(modifyValue);
    else if (modifyKey === "positionBy") component.setPositionBy(modifyValue);
    else component[modifyKey] = modifyValue;
}

export function getAllComponents() {
    return [...components];
}

export function getAllComponentHandles() {
    return [...components.values().map((c) => c.handle)];
}

function notifyComponentSubscribers() {
    const componentHandles = getAllComponentHandles();

    subscribers.forEach(({ listener, source }) => {
        try {
            listener(componentHandles);
        } catch (err) {
            reportPluginException(source, "Component subscriber failed.", err, {
                type: "plugin-component-subscriber-error",
                phase: "runtime",
                groupKey: `plugin:component-subscriber:${source?.id ?? "unknown"}`,
                summary: `${source?.id ?? "Plugin"} component subscriber failed`,
                status: "active",
                overlay: true
            });
        }
    });
}

export function subscribeComponentHandles(listener, source = null) {
    if (typeof listener !== "function") return () => {};

    const entry = { listener, source };
    subscribers.add(entry);
    try {
        listener(getAllComponentHandles());
    } catch (err) {
        reportPluginException(source, "Component subscriber failed.", err, {
            type: "plugin-component-subscriber-error",
            phase: "runtime",
            groupKey: `plugin:component-subscriber:${source?.id ?? "unknown"}`,
            summary: `${source?.id ?? "Plugin"} component subscriber failed`,
            status: "active",
            overlay: true
        });
    }

    return () => {
        subscribers.delete(entry);
    };
}
