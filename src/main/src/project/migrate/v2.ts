import { genId } from "@shared/genId";
import type * as V1 from "@shared/projectData/v1Data.types";
import type * as V2 from "@shared/projectData/v2Data.types";
import type { EntryTypePayload, TypePayloads } from "@shared/projectData/typePayload";

function resolveOutput<K extends string, T extends { [k in K]: V1.Output }>(
  object: T,
  ...outputKeys: K[]
): T & { [k in K]: string | null } {
  return {
    ...object,
    ...Object.fromEntries(outputKeys.map((k) => [k, object[k].to]))
  };
}

function moveToRecord<T extends Record<string, any>>(object: T, target: Record<string, T>) {
  const id = "id" in object ? (object.id as string) : genId();
  target[id] = object;
  return id;
}

function removeAndMove<K extends string, O extends { [k in K]: Record<string, any> }>(
  original: O,
  target: Record<string, any>,
  key: K
): O & { [k in K]: string } {
  const id = moveToRecord(original[key], target);
  return {
    ...original,
    [key]: id
  };
}

function removeAndMoveArr<K extends string, O extends { [k in K]: Record<string, any>[] }>(
  original: O,
  target: Record<string, any>,
  key: K
): O & { [k in K]: string[] } {
  const arr = original[key].map((e) => moveToRecord(e, target));
  return { ...original, [key]: arr };
}

function moveBulk<K extends string, O extends { [k in K]: Record<string, any> }>(
  original: O,
  payload: Record<K, Record<string, any>>
) {
  return Object.entries(payload).reduce((o, [key, target]) => {
    return removeAndMove(o, target as Record<string, any>, key);
  }, original) as O & { [k in K]: string };
}

function IdArr2Object<T extends { id: string }>(arr: T[]): Record<string, T> {
  return Object.fromEntries(arr.map((t) => [t.id, t]));
}

type NewTypeNode<N extends V1.Node> = N extends { type: infer T }
  ? Omit<N, "type"> & { nodeType: T }
  : never;
function nodeType<N extends V1.Node>(node: N) {
  const converted = { ...node, nodeType: node.type } as Omit<N, "type"> & {
    type?: N["type"];
    nodeType: N["type"];
  };
  delete converted.type;
  return converted as NewTypeNode<N>;
}

function joinType(type: string[] | string) {
  return Array.isArray(type) ? type.join(".") : type;
}
function stringifyType<P extends TypePayloads>(obj: { type: string[]; [k: string]: any }) {
  return { ...obj, type: joinType(obj.type) } as P;
}

export function migrateToV2(appVersion: string, data: V1.Data) {
  const tempPluginPointers: Record<string, V2.PluginPointer> = {};
  const runtimePlugins = (
    data.config.runtimePlugins?.map((p) => moveToRecord(p, tempPluginPointers)) ?? []
  ).filter((id): id is string => id !== null);
  const screenConfig: V2.ScreenConfigData =
    "screenConfig" in data.config
      ? data.config.screenConfig
      : {
          type: data.config.multiScreen ? "fullMultiScreen" : "fullscreen",
          payload: null
        };

  const config: V2.ProjectConfig = {
    ...data.config,
    screenConfig,
    runtimePlugins
  };

  const v2: V2.Data = {
    version: 2,
    appVersion,
    config,
    viewport: data.viewport,
    resources: IdArr2Object(data.resources),
    variables: IdArr2Object(data.variables),
    nodes: {},
    steps: {},
    components: {},
    elements: {},
    listeners: {},
    values: {},
    valueProcesses: {},
    pluginPointers: tempPluginPointers,
    updatedAt: data.updatedAt ?? Date.now()
  };

  const tempSteps: Record<string, V1.Step> = {};
  const tempValues: Record<string, V1.Value> = {};
  v2.nodes = IdArr2Object(
    data.nodes.map((node) => {
      if (node.type === "entry") {
        const { entryType, ...entry } = nodeType(resolveOutput(node, "output"));
        return {
          ...entry,
          type: joinType(entryType) as EntryTypePayload["type"]
        };
      }
      if (node.type === "branch") {
        return nodeType(
          resolveOutput(
            moveBulk(node, {
              valueA: tempValues,
              valueB: tempValues
            }),
            "trueOutput",
            "falseOutput"
          )
        );
      }
      if (node.type === "sequence") {
        return nodeType(resolveOutput(removeAndMoveArr(node, tempSteps, "steps"), "output"));
      }
      if (node.type === "variableSet") {
        return nodeType(resolveOutput(removeAndMove(node, tempValues, "value"), "output"));
      }
      throw new Error("Unknown node data.");
    })
  );

  const tempComponents: Record<string, V1.Component> = {};
  Object.values(tempSteps).forEach((step) => {
    const joinedType = joinType(step.type);
    if (joinedType === "Component.create") {
      const componentId = moveToRecord(step.payload as V1.Component, tempComponents);
      v2.steps[step.id] = { ...step, type: joinedType, payload: { componentId } };
      return;
    }
    if (joinedType === "Others.executePlugin") {
      const pluginPointerId = moveToRecord(step.payload.plugin, v2.pluginPointers);
      v2.steps[step.id] = {
        ...step,
        type: joinedType,
        payload: { plugin: pluginPointerId, waitTillEnd: step.payload.waitTillEnd }
      };
      return;
    }
    if (joinedType === "Communication.Socket.send" && typeof step.payload.data === "string") {
      v2.steps[step.id] = {
        ...step,
        type: joinedType,
        payload: {
          channel: step.payload.channel,
          data:
            typeof step.payload.splitStr === "string"
              ? step.payload.data.split(step.payload.splitStr)
              : [step.payload.data]
        }
      };
      return;
    }
    v2.steps[step.id] = stringifyType(step);
  });

  const tempElements: Record<string, V1.Element> = {};
  Object.values(tempComponents).forEach((component) => {
    const framePluginPointerId = moveToRecord(component.frame, v2.pluginPointers);
    const introPluginPointerId = moveToRecord(component.introTransition.plugin, v2.pluginPointers);
    const outroPluginPointerId = moveToRecord(component.outroTransition.plugin, v2.pluginPointers);
    v2.components[component.id] = {
      ...removeAndMoveArr(component, tempElements, "elements"),
      frame: framePluginPointerId,
      introTransition: { ...component.introTransition, plugin: introPluginPointerId },
      outroTransition: { ...component.outroTransition, plugin: outroPluginPointerId }
    };
  });

  const tempListeners: Record<string, V1.Listener> = {};
  Object.values(tempElements).forEach((element) => {
    const el: V2.Element = stringifyType(removeAndMoveArr(element, tempListeners, "listeners"));
    if (el.type === "plugin") {
      el.payload = {
        plugin: moveToRecord(element.payload as V1.PluginPointer, v2.pluginPointers)
      };
    }
    v2.elements[element.id] = el;
  });

  Object.entries(tempListeners).forEach(([id, listener]) => {
    const l: V2.Listener = stringifyType(resolveOutput(listener, "output"));
    l.id = id;
    if (l.type === "plugin")
      l.payload = {
        plugin: moveToRecord(listener.payload.plugin as V1.PluginPointer, v2.pluginPointers),
        channel: listener.payload.channel ? String(listener.payload.channel) : null
      };
    v2.listeners[id] = l;
  });

  Object.entries(tempValues).forEach(([id, value]) => {
    v2.values[id] = removeAndMoveArr(value, v2.valueProcesses, "process");
  });

  Object.entries(v2.valueProcesses).forEach(([id, vp]) => (vp.id = id));

  return v2;
}
