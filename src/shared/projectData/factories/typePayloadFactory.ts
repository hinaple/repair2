import type { TypePayloadMap, TypePayloads } from "../typePayload";
import { createPayload } from "../typePayload/create";
import type { PayloadTemplates } from "../typePayload/templates";
import {
  resolveFactoryValue,
  type FactoryResult,
  type FactoryObject,
  type Owning,
  type RegisterOwned
} from "./factory";

type TypePayloadNameOf<T> = {
  [K in keyof TypePayloadMap]: Exclude<T, { type: ""; payload: null }> extends TypePayloadMap[K]
    ? K
    : never;
}[keyof TypePayloadMap];

type Result<T, O extends Partial<T>> = O extends { type: string }
  ? Extract<T, { type: O["type"] }> extends never
    ? T
    : Extract<T, { type: O["type"] }>
  : T;

type TemplateKey<T> = Exclude<keyof T, "$types"> & string;
type JoinPath<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`;

type OwnRequirements<T> = T extends Owning
  ? string
  : T extends readonly unknown[]
    ? object
    : T extends object
      ? {
          [
            K in keyof T as keyof OwnRequirements<T[K]> extends never ? never : K
          ]-?: OwnRequirements<T[K]>;
        }
      : object;

type SafeCase<Type extends string, Template> = [Template] extends [never]
  ? { type: Type; payload?: null }
  : keyof OwnRequirements<Template> extends never
    ? { type: Type; payload?: unknown }
    : { type: Type; payload: OwnRequirements<Template> };

type SafeCases<T, Prefix extends string = ""> = {
  [K in TemplateKey<T>]: T[K] extends { $types: true }
    ? SafeCases<T[K], JoinPath<Prefix, K>>
    : SafeCase<JoinPath<Prefix, K>, T[K]>;
}[TemplateKey<T>];

type TemplateAtPath<T, Path extends string> = Path extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? TemplateAtPath<T[Head], Rest>
    : never
  : Path extends keyof T
    ? T[Path]
    : never;

type DefaultSafeCase<D, Template> = D extends { type: infer Type extends string }
  ? Omit<SafeCase<Type, TemplateAtPath<Template, Type>>, "type"> & { type?: Type }
  : never;

type TypePayloadFactoryCalls<T extends TypePayloads, D, Template> = {
  <O extends Partial<T> & (SafeCases<Template> | DefaultSafeCase<D, Template>)>(
    overrides: O,
    registerOwned?: RegisterOwned
  ): Result<T, O>;
  <O extends Partial<T>>(overrides: O | undefined, registerOwned: RegisterOwned): Result<T, O>;
} & (DefaultSafeCase<D, Template> extends { payload: unknown } ? object : { (): T }) &
  FactoryResult<T>;

export function createTypePayloadFactory<T extends TypePayloads>(
  typePayloadName: TypePayloadNameOf<T>
) {
  return <const D extends Omit<FactoryObject<T>, "payload">>(defaults: D) => {
    const factory = <O extends Partial<T>>(
      overrides?: O,
      registerOwned?: RegisterOwned
    ): Result<T, O> => {
      const { type: defaultType, ...noTypeDefaults } = defaults as Record<string, unknown>;
      const overrideRecord = overrides as Record<string, unknown> | undefined;
      const obj = Object.fromEntries(
        Object.entries(noTypeDefaults).map(([key, defaultValue]) => [
          key,
          resolveFactoryValue(defaultValue, overrideRecord?.[key], registerOwned)
        ])
      );
      const typeName = (overrideRecord?.type ?? defaultType) as TypePayloads["type"];
      return {
        ...obj,
        type: typeName,
        payload: createPayload(
          typePayloadName,
          typeName as never,
          (overrideRecord?.payload ?? undefined) as Record<string, unknown> | undefined,
          registerOwned
        )
      } as Result<T, O>;
    };
    return factory as TypePayloadFactoryCalls<
      T,
      D,
      (typeof PayloadTemplates)[TypePayloadNameOf<T>]
    >;
  };
}
