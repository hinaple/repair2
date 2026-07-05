export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Override<T, U> = Prettify<Omit<T, keyof U> & U>;

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ""
    ? []
    : S extends `${infer T}${D}${infer U}`
      ? [T, ...Split<U, D>]
      : [S];

export function typedSplit<S extends string, P extends string>(str: S, separator: P) {
  return str.split(separator) as Split<S, P>;
}

export type OmitTypePayload<O extends object> = Omit<O, "type" | "payload">;
