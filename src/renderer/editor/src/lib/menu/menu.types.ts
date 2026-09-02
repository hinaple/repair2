export type MenuSeparator = {
  type: "separator";
};

type MenuItemBase = {
  label: string;
  disabled?: boolean;
};

type MenuCloseBehavior = {
  closeOnActivate?: boolean;
};

export type MenuAction = MenuItemBase &
  MenuCloseBehavior & {
    type?: "button";
    activate?: () => unknown;
  };

export type MenuCheckbox = MenuItemBase &
  MenuCloseBehavior & {
    type: "checkbox";
    checked: boolean;
    activate?: (checked: boolean) => unknown;
  };

export type MenuRadio = MenuItemBase &
  MenuCloseBehavior & {
    type: "radio";
    checked: boolean;
    activate?: () => unknown;
  };

export type MenuSubmenu = MenuItemBase & {
  type: "submenu";
  items: readonly MenuItem[];
};

export type MenuItem = MenuSeparator | MenuAction | MenuCheckbox | MenuRadio | MenuSubmenu;

export type MenuButtonItem = Exclude<MenuItem, MenuSeparator>;
