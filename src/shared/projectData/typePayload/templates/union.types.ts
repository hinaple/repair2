import type { Prettify } from "../../../utils.types";
import type { Owning } from "../../factories/factory";

type TemplateKey<T> = Exclude<keyof T, "$types"> & string;

type JoinPath<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`;

type PayloadFromTemplate<T> =
  T extends NullDefault<infer U>
    ? U | null
    : T extends OneOf<infer U>
      ? U
      : T extends Owning
        ? string
        : T extends string
          ? string | null
          : T extends number
            ? number | null
            : T extends boolean
              ? boolean
              : T extends null
                ? string | number | null
                : T extends readonly (infer U)[]
                  ? PayloadFromTemplate<U>[]
                  : T extends object
                    ? { -readonly [K in keyof T]: PayloadFromTemplate<T[K]> }
                    : T;

type NextTemplate<T, Prefix extends string> = {
  [K in TemplateKey<T>]: TP<T[K], JoinPath<Prefix, K>, false>;
}[TemplateKey<T>];

export type TP<T, Prefix extends string = "", IsRoot extends boolean = true> = IsRoot extends true
  ? NextTemplate<T, Prefix>
  : T extends { $types: true }
    ? NextTemplate<T, Prefix>
    : {
        type: Prefix;
      } & {
        payload: PayloadFromTemplate<T>;
      };

export type TypePayloadUnion<T> = Prettify<TP<T> | { type: ""; payload: null }>;

type NullDefault<T> = {
  readonly __defaultNullType?: T;
};
export const nullDefault = <T>() => null as unknown as NullDefault<T>;

type OneOf<T extends string> = {
  readonly __unionType?: T;
};
export const oneOf = <T extends string>(v: T) => v as unknown as OneOf<T>;
