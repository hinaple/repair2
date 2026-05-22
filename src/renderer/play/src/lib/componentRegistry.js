import { reportPluginException } from "./plugin/pluginReporter";

let readComponents = () => [];
const subscribers = new Set();

function createComponentHandle(component) {
    return {
        id: component.componentId,
        realId: component.realId,
        alias: component.componentData?.alias ?? null,
        visible: !!component.visible,
        zIndex: component.zIndex ?? component.componentData.zIndex ?? null,
        element: component,
        meta: {
            unbreakable: !!component.unbreakable,
            hasFrame: !!component.frameEl,
            elementCount: component.elements?.length ?? 0
        }
    };
}

export function setComponentReader(reader) {
    readComponents = typeof reader === "function" ? reader : () => [];
}

export function listComponentHandles() {
    return readComponents().filter(Boolean).map(createComponentHandle);
}

export function getComponentHandle(id) {
    if (!id) return null;
    return (
        listComponentHandles().find(
            (component) => component.id === id || component.realId === id
        ) ?? null
    );
}

export function resolveComponentHandleId(id) {
    return getComponentHandle(id)?.id ?? null;
}

export function hasComponentHandle(id) {
    return !!getComponentHandle(id);
}

export function notifyComponentSubscribers() {
    const components = listComponentHandles();
    subscribers.forEach(({ listener, source }) => {
        try {
            listener(components);
        } catch (err) {
            reportPluginException(source, "Component subscriber failed.", err);
        }
    });
}

export function subscribeComponentHandles(listener, source = null) {
    if (typeof listener !== "function") return () => {};

    const entry = { listener, source };
    subscribers.add(entry);
    try {
        listener(listComponentHandles());
    } catch (err) {
        reportPluginException(source, "Component subscriber failed.", err);
    }

    return () => {
        subscribers.delete(entry);
    };
}
