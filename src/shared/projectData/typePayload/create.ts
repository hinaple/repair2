import { typedSplit } from "../../utils.types";
import { PayloadTemplates } from "./templates";
import type { TypePayloadMap, TypePayloads } from "./templates/types";

type TypePayloadKey = keyof TypePayloadMap;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneTemplate<T>(value: T, overrides?: unknown): T {
  if (Array.isArray(value)) {
    return (overrides && Array.isArray(overrides) ? overrides : value).map((v) =>
      cloneTemplate(v)
    ) as T;
  }

  if (typeof value === "object" && value !== null) {
    const doOverride = overrides && typeof overrides === "object" && overrides !== null;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        cloneTemplate(doOverride ? ((overrides as Record<string, unknown>)?.[key] ?? item) : item)
      ])
    ) as T;
  }

  return overrides !== undefined && typeof overrides !== "object" && !Array.isArray(overrides)
    ? (overrides as T)
    : value;
}

export function createPayload<
  K extends TypePayloadKey,
  T extends TypePayloadMap[K]["type"],
  P extends Extract<TypePayloadMap[K], { type: T }>["payload"]
>(name: K, type: T, overrides?: Record<string, unknown>): P | null {
  let template: unknown = PayloadTemplates[name];
  const types = typedSplit(type, ".");
  if (types.length === 0) return null;

  for (const key of types) {
    if (!isRecord(template) || !(key in template)) {
      return null;
    }

    template = template[key];
  }

  if (isRecord(template) && template.$types === true) {
    return null;
  }

  return cloneTemplate(template as P, overrides);
}
