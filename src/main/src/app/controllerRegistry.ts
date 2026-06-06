import type { MainControllers } from "./mainContext.types";

type ControllerSlots = {
    [Key in keyof MainControllers]: MainControllers[Key] | null;
};

export type ControllerRegistry = MainControllers & {
    set<Key extends keyof MainControllers>(key: Key, controller: MainControllers[Key]): void;
};

export function createControllerRegistry(): ControllerRegistry {
    const slots: ControllerSlots = {
        pluginHmr: null,
        project: null,
        serviceInitializer: null,
        window: null
    };

    function requireController<Key extends keyof MainControllers>(key: Key) {
        const controller = slots[key];
        if (!controller) throw new Error(`${String(key)} controller is not initialized.`);
        return controller;
    }

    return {
        get pluginHmr() {
            return requireController("pluginHmr");
        },
        get project() {
            return requireController("project");
        },
        get serviceInitializer() {
            return requireController("serviceInitializer");
        },
        get window() {
            return requireController("window");
        },
        set<Key extends keyof MainControllers>(key: Key, controller: MainControllers[Key]) {
            slots[key] = controller;
        }
    };
}
