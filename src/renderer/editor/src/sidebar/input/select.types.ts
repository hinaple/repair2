export type SelectValue = string | number | boolean;

export type SelectValueOption<T extends SelectValue> = {
  value: T;
  label?: string;
  disabled?: boolean;
};

export type SelectSubmenuOption<T extends SelectValue> = {
  type: "submenu";
  label: string;
  options: readonly SelectOption<T>[];
  disabled?: boolean;
};

export type SelectOption<T extends SelectValue> =
  | T
  | SelectValueOption<T>
  | readonly [T, string]
  | SelectSubmenuOption<T>;
