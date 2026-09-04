import type { PluginInfo, PluginType } from "./type";

export type SerializedRuntimeError = {
  name: string;
  message: string;
  stack?: string;
};

export type RuntimeHostRequest =
  | {
      id: string;
      type: "update-plugin";
      payload: { pluginDir: string; pluginInfo: PluginInfo; forceImport: boolean };
    }
  | {
      id: string;
      type: "create-instance";
      payload: { pluginName: string; activationId: string };
    }
  | {
      id: string;
      type: "activate-instance";
      payload: {
        pluginName: string;
        activationId: string;
        rendererMethods: string[];
        attributes: Record<string, unknown>;
      };
    }
  | {
      id: string;
      type: "call-main";
      payload: {
        pluginName: string;
        activationId: string;
        methodName: string;
        args: unknown[];
      };
    }
  | {
      id: string;
      type: "dispose-instance";
      payload: { pluginName: string; activationId?: string };
    }
  | {
      id: string;
      type: "remove-plugin";
      payload: { pluginName: string };
    }
  | {
      id: string;
      type: "remove-all-except";
      payload: { pluginNames: string[] };
    }
  | { id: string; type: "dispose-all"; payload: Record<string, never> }
  | { id: string; type: "shutdown"; payload: Record<string, never> };

export type RuntimeHostDiagnostic = {
  type: "diagnostic";
  kind: "load" | "factory" | "method" | "disposer" | "dispose";
  plugin: { name: string; type: PluginType };
  methodName?: string;
  error: SerializedRuntimeError;
};

export type RuntimeHostResponse =
  | { type: "response"; replyTo: string; ok: true; result: unknown }
  | { type: "response"; replyTo: string; ok: false; error: SerializedRuntimeError };

export type RuntimeHostRendererCall = {
  type: "renderer-call";
  pluginName: string;
  activationId: string;
  methodName: string;
  args: unknown[];
};

export type RuntimeHostMessage =
  RuntimeHostResponse | RuntimeHostRendererCall | RuntimeHostDiagnostic;

export function serializeRuntimeError(error: unknown): SerializedRuntimeError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {})
    };
  }

  return {
    name: "Error",
    message: typeof error === "string" ? error : String(error)
  };
}

export function deserializeRuntimeError(error: SerializedRuntimeError): Error {
  const result = new Error(error.message);
  result.name = error.name;
  if (error.stack) result.stack = error.stack;
  return result;
}
