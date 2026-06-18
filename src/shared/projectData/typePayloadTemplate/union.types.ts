type TemplateKey<T> = Exclude<keyof T, "isTypeObj"> & string;

type JoinPath<Prefix extends string, Key extends string> = Prefix extends ""
    ? Key
    : `${Prefix}.${Key}`;

type PayloadFromTemplate<T> = T extends string
    ? string | null | ""
    : T extends number
      ? number | null
      : T extends boolean
        ? boolean
        : T extends null
          ? string | number | null
          : T extends readonly (infer U)[]
            ? PayloadFromTemplate<U>[]
            : T extends object
              ? { [K in keyof T]: PayloadFromTemplate<T[K]> }
              : T;

type NextTemplate<T, TYPESTRING extends string, Prefix extends string> = {
    [K in TemplateKey<T>]: TypePayloadUnion<T[K], TYPESTRING, JoinPath<Prefix, K>, false>;
}[TemplateKey<T>];

export type TypePayloadUnion<
    T,
    TYPESTRING extends string = "type",
    Prefix extends string = "",
    IsRoot extends boolean = true
> = IsRoot extends true
    ? NextTemplate<T, TYPESTRING, Prefix>
    : T extends { isTypeObj: true }
      ? NextTemplate<T, TYPESTRING, Prefix>
      : {
            [k in TYPESTRING]: Prefix;
        } & {
            payload: PayloadFromTemplate<T>;
        };
