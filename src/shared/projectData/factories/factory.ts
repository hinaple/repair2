import type { RecordKey, RecordValue } from "../../constants";

const NESTED_FACTORY = Symbol("nestedFactory");
const RECORD_FACTORY = Symbol("recordFactory");
const RECORD_KEY = Symbol("recordKey");
const OWNING = Symbol("ownFactory");
const FACTORY_DEFINITION = Symbol("factoryDefinition");
const FACTORY_RESULT = Symbol("factoryResult");

export type RegisterOwned = <K extends RecordKey>(type: K, data: RecordValue<K>) => string | void;

type RuntimeFactory<T extends object> = (
  overrides?: Partial<T>,
  registerOwned?: RegisterOwned
) => T;

export type FactoryResult<T extends object> = {
  readonly [FACTORY_RESULT]?: T;
};

type NestedFactory<T extends object, D extends object = object> = {
  [NESTED_FACTORY]: true;
  factory: RuntimeFactory<T>;
  definition?: D;
};

type RecordFactory<T extends object, K extends keyof T & string = keyof T & string> = {
  [RECORD_FACTORY]: true;
  factory: RuntimeFactory<T>;
  idKey?: K;
};

export type ProjectRecordFactory<K extends RecordKey, T extends object = object> = ((
  overrides: undefined,
  registerOwned: RegisterOwned
) => T) & {
  [RECORD_KEY]: K;
} & FactoryResult<T>;

type ProjectRecordFactoryTag<K extends RecordKey, T extends object> = {
  [RECORD_KEY]: K;
} & FactoryResult<T>;

export type Owning<K extends RecordKey = RecordKey, T extends object = object> = {
  [OWNING]: true;
  factory: ProjectRecordFactory<K, T>;
};

type FactoryValue<T> = [T] extends [object]
  ? string extends keyof T
    ? T extends Record<string, infer V>
      ? [V] extends [object]
        ? (() => T) | RecordFactory<V>
        : () => T
      : () => T
    : (() => T) | NestedFactory<T>
  : T extends string
    ? T | (() => T) | Owning
    : T | (() => T);

export type FactoryObject<T extends object> = {
  [K in keyof T]: FactoryValue<T[K]>;
};

type OwnRequirement<V> = V extends Owning
  ? string
  : V extends NestedFactory<infer T, infer D>
    ? OwnRequirements<D> extends infer R
      ? R extends object
        ? keyof R extends never
          ? never
          : Partial<T> & R
        : never
      : never
    : never;

type OwnRequirements<D extends object> = {
  [K in keyof D as OwnRequirement<D[K]> extends never ? never : K]-?: OwnRequirement<D[K]>;
};

type FactoryOverrides<T extends object, D extends object> = {
  [K in keyof T]?: K extends keyof D
    ? D[K] extends NestedFactory<infer NT, infer ND>
      ? FactoryOverrides<NT, ND>
      : T[K]
    : T[K];
};

type Result<T, O extends object> = T extends { type: string }
  ? O extends { type: string }
    ? Extract<T, { type: O["type"] }> extends never
      ? T
      : Extract<T, { type: O["type"] }>
    : T
  : T;

type FactoryCalls<
  T extends object,
  D extends FactoryObject<T>
> = keyof OwnRequirements<D> extends never
  ? <O extends FactoryOverrides<T, D>>(overrides?: O, registerOwned?: RegisterOwned) => Result<T, O>
  : {
      <O extends FactoryOverrides<T, D> & OwnRequirements<D>>(
        overrides: O,
        registerOwned?: RegisterOwned
      ): Result<T, O>;
      <O extends FactoryOverrides<T, D>>(
        overrides: O | undefined,
        registerOwned: RegisterOwned
      ): Result<T, O>;
    };

type CreatedFactory<T extends object, D extends FactoryObject<T>> = FactoryCalls<T, D> & {
  readonly [FACTORY_DEFINITION]?: D;
} & FactoryResult<T>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNestedFactory(value: unknown): value is NestedFactory<object> {
  return isRecord(value) && (value as Partial<NestedFactory<object>>)[NESTED_FACTORY] === true;
}

function isRecordFactory(value: unknown): value is RecordFactory<object> {
  return isRecord(value) && (value as Partial<RecordFactory<object>>)[RECORD_FACTORY] === true;
}

export function isOwns(value: unknown): value is Owning {
  return isRecord(value) && (value as Partial<Owning>)[OWNING] === true;
}

export function resolveFactoryValue(
  defaultValue: unknown,
  overrideValue: unknown,
  registerOwned?: RegisterOwned
) {
  if (isNestedFactory(defaultValue)) {
    return defaultValue.factory(isRecord(overrideValue) ? overrideValue : undefined, registerOwned);
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
              : itemOverride,
            registerOwned
          )
        ];
      })
    );
  }

  if (isOwns(defaultValue)) {
    if (typeof overrideValue === "string") return overrideValue;

    if (!registerOwned) {
      throw new Error(
        `registerOwned is required to create an owned ${defaultValue.factory[RECORD_KEY]} record.`
      );
    }

    const type = defaultValue.factory[RECORD_KEY];
    const data = defaultValue.factory(undefined, registerOwned);
    const registeredId = registerOwned(type, data as RecordValue<typeof type>);
    if (typeof registeredId === "string") return registeredId;
    if (registeredId !== undefined) {
      throw new Error(`registerOwned returned a non-string ID for an owned ${type} record.`);
    }

    if ("id" in data && typeof data.id === "string") return data.id;

    throw new Error(
      `registerOwned did not return an ID and the owned ${type} record has no string id.`
    );
  }

  if (overrideValue !== undefined) return overrideValue;

  return typeof defaultValue === "function" ? (defaultValue as () => unknown)() : defaultValue;
}

export function nested<T extends object, D extends FactoryObject<T>>(
  factory: CreatedFactory<T, D>
): NestedFactory<T, D>;
export function nested<T extends object>(
  factory: RuntimeFactory<T> & FactoryResult<T>
): NestedFactory<T>;
export function nested<T extends object>(factory: RuntimeFactory<T>): NestedFactory<T> {
  return {
    [NESTED_FACTORY]: true,
    factory
  };
}

export function recordOf<T extends object, K extends keyof T & string>(
  factory: RuntimeFactory<T> & FactoryResult<T>,
  idKey?: K
): RecordFactory<T, K> {
  return {
    [RECORD_FACTORY]: true,
    factory,
    idKey
  };
}

export function owns<K extends RecordKey, T extends object>(
  factory: ((overrides: undefined, registerOwned: RegisterOwned) => T) &
    ProjectRecordFactoryTag<K, T>
): Owning<K, T> {
  return {
    [OWNING]: true,
    factory
  };
}

function buildFactory<T extends object, D extends FactoryObject<T>>(
  defaults: D
): CreatedFactory<T, D> {
  return ((overrides?: Partial<T>, registerOwned?: RegisterOwned) => {
    const overrideRecord = overrides as Record<string, unknown> | undefined;
    return Object.fromEntries(
      Object.entries(defaults).map(([key, defaultValue]) => [
        key,
        resolveFactoryValue(defaultValue, overrideRecord?.[key], registerOwned)
      ])
    ) as T;
  }) as CreatedFactory<T, D>;
}

export function createFactory<T extends object>(): <const D extends FactoryObject<T>>(
  defaults: D
) => CreatedFactory<T, D>;
export function createFactory<T extends object>(
  defaults: FactoryObject<T>
): RuntimeFactory<T> & FactoryResult<T>;
export function createFactory<T extends object>(defaults?: FactoryObject<T>) {
  if (defaults === undefined) {
    return <const D extends FactoryObject<T>>(curriedDefaults: D) =>
      buildFactory<T, D>(curriedDefaults);
  }
  return buildFactory<T, typeof defaults>(defaults);
}

export function createRecordFactory<K extends RecordKey, F extends (...args: never[]) => object>(
  recordKey: K,
  factory: F & (ReturnType<F> extends RecordValue<K> ? unknown : never)
): F & ProjectRecordFactoryTag<K, ReturnType<F>> {
  const recordFactory = factory as unknown as F & ProjectRecordFactoryTag<K, ReturnType<F>>;
  recordFactory[RECORD_KEY] = recordKey;
  return recordFactory;
}
