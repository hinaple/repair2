import { registerPluginContextApi } from "./plugin/pluginContext";
import { registerUtils } from "./repairUtils";
import { sendChanges } from "./runtimeMonitor";
import { Types } from "@shared/projectData/types";

type VarSubscriber = (v: string | null) => void;

interface RuntimeVariableData {
  id: string;
  name: string | null;
  value: any;
  defaultValue: string | null;
  subscriptions: Set<VarSubscriber>;
  set(v: string | null): void;
  subscribe(cb: VarSubscriber): () => void;
}

const variables: Map<string, RuntimeVariableData> = new Map();
export function getVariables() {
  return variables;
}
export function getVariable(id: string) {
  return variables.get(id);
}

export function registerVariables(variableMap: Map<string, Types.Variable>) {
  variables.clear();
  variableMap.forEach((v, k) => {
    variables.set(k, {
      id: k,
      name: v.name,
      value: v.defaultValue,
      defaultValue: v.defaultValue ?? null,
      subscriptions: new Set(),
      set(v: string | null) {
        this.value = v;
        this.subscriptions.forEach((c) => c(v));
      },
      subscribe(cb: VarSubscriber) {
        this.subscriptions.add(cb);
        return () => this.subscriptions.delete(cb);
      }
    });
  });
}

export function getVar(id: string) {
  return variables.get(id)?.value;
}

export function setVar(id: string, value: string | null) {
  const v = variables.get(id);
  if (!v) return;
  v.value = value;
  v.subscriptions.forEach((c) => c(value));

  sendChanges("variable", "changed", id, value);
}

export function resetAllVar() {
  variables.forEach((v) => v.set(v.defaultValue));
}

export function subscribe(id: string, callback: VarSubscriber) {
  return variables.get(id)?.subscribe(callback);
}

function getVariableByName(variableName: string) {
  return variables.values().find((variable) => variable.name === variableName) ?? null;
}

registerUtils("variables", {
  get(variableName) {
    return getVariableByName(variableName)?.value;
  },
  set(variableName, value) {
    return getVariableByName(variableName)?.set(value);
  },
  subscribe(variableName, callback) {
    return getVariableByName(variableName)?.subscribe(callback);
  }
});

registerPluginContextApi("variable", ({ warn, error, onDispose }) => {
  function getVariable(variableName: string) {
    const v = getVariableByName(variableName);
    if (!v) warn(`Variable does not exist: ${variableName}`);

    return v;
  }

  return {
    get(variableName: string) {
      return getVariable(variableName)?.value;
    },
    set(variableName: string, value: unknown) {
      getVariable(variableName)?.set(value as string);
    },
    subscribe(variableName: string, listener: (value: unknown) => void) {
      const unsubscribe = getVariable(variableName)?.subscribe((value) => {
        try {
          listener(value);
        } catch (err) {
          error(`Variable subscriber failed: ${variableName}`, err);
        }
      });
      if (!unsubscribe) return () => {};
      onDispose(unsubscribe);
      return unsubscribe;
    }
  };
});

export type { RuntimeVariableData };
