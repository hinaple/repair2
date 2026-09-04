export type Field = { label: string; autofocus?: boolean } & (
  | {
      type: "select";
      placeholder?: string | boolean;
      value?: string;
      options: readonly string[] | Record<string, string>;
      required?: boolean;
    }
  | {
      type?: "input";
      placeholder?: string;
      value?: string;
      filter?: (value: string) => string | null;
      required?: boolean;
    }
  | {
      type: "checkbox";
      value?: boolean;
      required?: false;
    }
);

type SelectOptionValue<O> = O extends readonly (infer V)[]
  ? V & string
  : O extends Record<infer K, string>
    ? K & string
    : string;

type MaybeRequired<F extends Field, V> = F extends { required: true } ? V : V | null;

export type FieldValue<F extends Field> = F extends { type: "checkbox" }
  ? boolean
  : F extends { type: "select"; options: infer O }
    ? MaybeRequired<F, SelectOptionValue<O>>
    : MaybeRequired<F, string>;

export type FieldValues<Fields extends readonly Field[]> = {
  [K in keyof Fields]: Fields[K] extends Field ? FieldValue<Fields[K]> : never;
};

export type ModalResult<Fields extends readonly Field[]> =
  { canceled: true; fields?: undefined } | { canceled: false; fields: FieldValues<Fields> };

export type ResolveParams = {
  canceled: boolean;
  fields?: (boolean | string | null)[];
};

export type Resolve = (modalData: ResolveParams) => unknown;

export type Button = {
  label: string;
  onclick?: Resolve;
};

export type Modal<Fields extends readonly Field[] = readonly Field[]> = {
  title: string;
  fields: Fields;
  buttons?: Button[];
  resolve?: Resolve;
};
