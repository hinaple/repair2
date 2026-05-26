export type Disposer = () => void;
export type MaybePromise<T> = T | Promise<T>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * Runtime payload object passed to plugin code.
 * This is not the manifest `attributes` declaration list.
 */
export type Attributes = Record<string, unknown>;
export type Method = (...args: any[]) => any;
export type MethodMap = Record<string, Method>;
/**
 * Generic constraint for typed main/renderer bridge method objects.
 * Most plugin code should define a plain method object type instead of using this directly.
 */
export type MethodShape<TMethods extends object> = {
    [K in keyof TMethods]: Method;
};

export type PluginType = "runtime" | "element" | "frame" | "function" | "transition";
