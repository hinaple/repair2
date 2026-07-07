export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Override<T, U> = Prettify<Omit<T, keyof U> & U>;

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export function typedEntries<T extends Record<string | number | symbol, unknown>>(
  o: T
): Entries<T> {
  return Object.entries(o) as Entries<T>;
}

export function typedFromEntries<K extends string, T extends unknown>(
  e: [K, T][]
): { [k in K]: T } & {} {
  return Object.fromEntries(e) as Record<K, T>;
}

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

export function typedIncludes<T, S extends readonly T[]>(arr: S, search: T): search is S[number] {
  return arr.includes(search);
}

export type ValueOf<T> = T[keyof T];

export type Tuple<
  Length extends number,
  Type = unknown,
  Accumulator extends unknown[] = []
> = Accumulator["length"] extends Length
  ? Accumulator
  : Tuple<Length, Type, [...Accumulator, Type]>;

export function truthy<T>(a: T): a is Extract<T, string | number> {
  return !!a;
}
