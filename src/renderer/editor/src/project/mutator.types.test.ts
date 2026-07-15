import type { Binding, FieldBinding } from "./mutator";

declare const strings: Binding<string[]>;
const stringItem: FieldBinding<string> = strings.at(0);
strings.splice(0, 0, "value");
strings.move(0, 1);

// @ts-expect-error Array bindings only accept their item type.
strings.splice(0, 0, 1);

declare const scalar: Binding<string | null>;
scalar.set("value");
scalar.set(null);

// @ts-expect-error Scalar bindings do not expose array mutation methods.
scalar.splice(0, 0, "value");

void stringItem;
