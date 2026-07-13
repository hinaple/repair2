import type { RecordKey, RecordValue } from "../../constants";
import type { TypePayloadMap, TypePayloads } from "../typePayload";
import { createPayload } from "../typePayload/create";

const NESTED_FACTORY = Symbol("nestedFactory");
const RECORD_FACTORY = Symbol("recordFactory");
const OWNING = Symbol("ownFactory");

type Factory<T extends object> = (overrides?: Partial<T>) => T;

type NestedFactory<T extends object> = {
  [NESTED_FACTORY]: true;
  factory: Factory<T>;
};

type RecordFactory<T extends object, K extends keyof T & string = keyof T & string> = {
  [RECORD_FACTORY]: true;
  factory: Factory<T>;
  idKey?: K;
};

type Owning<
  T extends RecordKey,
  O extends RecordValue<T> = RecordValue<T>,
  K extends keyof O & string = keyof O & string
> = {
  [OWNING]: true;
  recordKey: T;
  idKey?: K;
};

type FactoryValue<T> = [T] extends [object]
  ? string extends keyof T
    ? T extends Record<string, infer V>
      ? [V] extends [object]
        ? (() => T) | RecordFactory<V>
        : [V] extends [RecordKey]
          ? (() => T) | Owning<V>
          : () => T
      : () => T
    : (() => T) | NestedFactory<T>
  : T | (() => T);

type FactoryObject<T extends object> = {
  [K in keyof T]: FactoryValue<T[K]>;
};

type Result<T, O extends Partial<T>> = T extends TypePayloads
  ? O extends { type: string }
    ? Extract<T, { type: O["type"] }>
    : T
  : T;

type TypePayloadNameOf<T> = {
  [K in keyof TypePayloadMap]: Exclude<T, { type: ""; payload: null }> extends TypePayloadMap[K]
    ? K
    : never;
}[keyof TypePayloadMap];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNestedFactory(value: unknown): value is NestedFactory<object> {
  return isRecord(value) && (value as Partial<NestedFactory<object>>)[NESTED_FACTORY] === true;
}

function isRecordFactory(value: unknown): value is RecordFactory<object> {
  return isRecord(value) && (value as Partial<RecordFactory<object>>)[RECORD_FACTORY] === true;
}

function isOwns(value: unknown): value is Owning<RecordKey> {
  return isRecord(value) && (value as Partial<Owning<RecordKey>>)[OWNING] === true;
}

function resolveFactoryValue(defaultValue: unknown, overrideValue: unknown) {
  if (isNestedFactory(defaultValue)) {
    return defaultValue.factory(isRecord(overrideValue) ? overrideValue : undefined);
  }

  if (isRecordFactory(defaultValue)) {
    if (!isRecord(overrideValue)) return {};

    return Object.fromEntries(
      Object.entries(overrideValue).map(([recordKey, item]) => {
        const itemOverride = isRecord(item) ? item : {};
        return [
          recordKey,
          defaultValue.factory(
            defaultValue.idKey
              ? {
                  ...itemOverride,
                  [defaultValue.idKey]: recordKey
                }
              : itemOverride
          )
        ];
      })
    );
  }

  if (overrideValue !== undefined) return overrideValue;
  return typeof defaultValue === "function" ? (defaultValue as () => unknown)() : defaultValue;
}

export function nested<T extends object>(factory: Factory<T>): NestedFactory<T> {
  return {
    [NESTED_FACTORY]: true,
    factory
  };
}

export function recordOf<T extends object, K extends keyof T & string>(
  factory: Factory<T>,
  idKey?: K
): RecordFactory<T, K> {
  return {
    [RECORD_FACTORY]: true,
    factory,
    idKey
  };
}

export function owns<T extends RecordKey, K extends keyof RecordValue<T> & string>(
  recordKey: T,
  idKey?: K
): Owning<T> {
  return {
    [OWNING]: true,
    recordKey,
    idKey
  };
}

type OwnCallback = (type: RecordKey, id: string) => unknown;

export function createFactory<T extends TypePayloads>(
  defaults: Omit<FactoryObject<T>, "payload">,
  typePayloadName: TypePayloadNameOf<T>
): <O extends Partial<T>>(overrides?: O, owns?: OwnCallback) => Result<T, O>;
export function createFactory<T extends object>(
  defaults: FactoryObject<T>
): <O extends Partial<T>>(overrides?: O, owns?: OwnCallback) => Result<T, O>;
export function createFactory(defaults: object, typePayloadName?: keyof TypePayloadMap) {
  const { type: defaultType, ...noTypeDefaults } = defaults as Record<string, unknown>;
  return (overrides?: object) => {
    const overrideRecord = overrides as Record<string, unknown> | undefined;
    const obj = Object.fromEntries(
      Object.entries(noTypeDefaults).map(([k, v]) => {
        return [k, resolveFactoryValue(v, overrideRecord?.[k])];
      })
    );
    if (typePayloadName) {
      const typeName = (overrideRecord?.type ?? defaultType) as TypePayloads["type"];
      return {
        ...obj,
        type: typeName,
        payload: createPayload(
          typePayloadName,
          typeName,
          (overrideRecord?.payload ?? undefined) as Record<string, unknown> | undefined
        )
      };
    }
    return obj;
  };
}
