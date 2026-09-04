import { getRef } from "../project/refs";
import RepairComponent from "../webcomponents/repairComponent";
import { registerPluginContextApi } from "./plugin/pluginContext";
import { reportPluginException } from "./plugin/pluginReporter";
import { sendChanges } from "./runtimeMonitor";
import type { ComponentHandle, PluginIdentity } from "@fainthit/repair2-plugin-sdk";
import type { Types } from "@shared/projectData/types";
type ComponentData = Types.Component;

const gamezone = document.getElementById("gamezone")!;

const components: Set<RepairComponent> = new Set();

const subscribers: Set<{
  listener: (comps: ComponentHandle[]) => unknown;
  source: PluginIdentity;
}> = new Set();

export function compId(componentData: ComponentData): string {
  return componentData.alias || componentData.id;
}

function getDuplicatedComponent(componentData: ComponentData) {
  return components
    .values()
    .find((c) => c.realId === componentData.id || c.componentId === compId(componentData));
}
export function getComponent(aliasOrId: string) {
  return components.values().find((c) => c.componentId === aliasOrId);
}

export function addComponent(componentId: string) {
  const componentData = getRef("components", componentId, false);
  const duplicatedComp = getDuplicatedComponent(componentData);
  if (duplicatedComp) removeComponent(duplicatedComp, false);
  const newComponent = new RepairComponent(componentData, !duplicatedComp);
  gamezone.appendChild(newComponent);

  components.add(newComponent);
  notifyComponentSubscribers();
  sendChanges("component", "created", componentData.id);
}
export async function removeComponent(
  component: RepairComponent,
  playOutro = true,
  noNotify = false
) {
  if (!component) return;

  components.delete(component);
  sendChanges("component", "removed", component.realId);
  if (!noNotify) notifyComponentSubscribers();

  if (playOutro && component.outroTransition)
    await component.startTransition(component.outroTransition, true);
  gamezone.removeChild(component);
}

export function removeComponentByAlias(alias: string, ignoreUnbreakable = false) {
  const component = getComponent(alias);
  if (!component || (!ignoreUnbreakable && component?.unbreakable)) return;
  removeComponent(component);
}
export function clearComponents(ignoreUnbreakable = false) {
  components.forEach((c) => {
    if (!ignoreUnbreakable && c?.unbreakable) return;
    removeComponent(c, true, true);
    components.delete(c);
  });
  notifyComponentSubscribers();
  sendChanges("component", "set", [...components.values().map((c) => c.realId)]);
}

export function modifyComponentByAlias(alias: string, modifyKey: string, modifyValue: any): void {
  const component = getComponent(alias);
  if (!component) return;

  if (modifyKey === "visible") component.setVisible(Boolean(modifyValue));
  else if (modifyKey === "style") component.renderStyle(String(modifyValue));
  else if (modifyKey === "zIndex") component.setZIndex(Number(modifyValue));
  else if (modifyKey === "position") component.setPosition(modifyValue);
  else if (modifyKey === "positionBy") component.setPositionBy(modifyValue);
  // else if (Object.hasOwn(component, modifyKey)) component[modifyKey] = modifyValue;
}

export function getAllComponents() {
  return [...components];
}

export function getAllComponentHandles() {
  return [...components.values().map((c) => c.handle)];
}

function notifyComponentSubscribers() {
  if (!subscribers.size) return;

  const componentHandles = getAllComponentHandles();

  subscribers.forEach(({ listener, source }) => {
    try {
      listener(componentHandles);
    } catch (err) {
      reportPluginException(source, "Component subscriber failed.", err, {
        type: "plugin-component-subscriber-error",
        summary: `${source?.id ?? "Plugin"} component subscriber failed`
      });
    }
  });
}

export function subscribeComponentHandles(
  listener: (comps: ComponentHandle[]) => unknown,
  source: PluginIdentity
) {
  if (typeof listener !== "function") return () => {};

  const entry = { listener, source };
  subscribers.add(entry);
  try {
    listener(getAllComponentHandles());
  } catch (err) {
    reportPluginException(source, "Component subscriber failed.", err, {
      type: "plugin-component-subscriber-error",
      summary: `${source?.id ?? "Plugin"} component subscriber failed`
    });
  }

  return () => {
    subscribers.delete(entry);
  };
}

registerPluginContextApi("component", ({ plugin, onDispose, compId }) => {
  return {
    list() {
      return getAllComponentHandles();
    },
    get(aliasOrId = compId): ComponentHandle | undefined {
      return components
        .values()
        .find((c) => c.componentData.id === aliasOrId || c.componentData.alias === aliasOrId)
        ?.handle;
    },
    subscribe(listener: (components: ComponentHandle[]) => void) {
      const unsubscribe = subscribeComponentHandles(listener, plugin);
      onDispose(unsubscribe);
      return unsubscribe;
    },
    clear(ignoreUnbreakable = false) {
      clearComponents(!!ignoreUnbreakable);
    }
  };
});
