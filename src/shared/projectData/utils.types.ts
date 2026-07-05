export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Override<T, U> = Prettify<Omit<T, keyof U> & U>;
