import type { Prettify } from "@shared/utils.types";

export type MenuItem = Prettify<
  | { type: "separator" }
  | ((
      | {
          type: "submenu";
          items: MenuItem[];
          opened?: boolean;
        }
      | ((
          | {
              type?: "button";
            }
          | {
              type: "checkbox";
              checked?: boolean;
            }
        ) & {
          click?: () => unknown;
        })
    ) & {
      label: string;
    })
>;
