import type { MainState } from "./mainApp.types";

export function createMainAppState(): MainState {
    return {
        project: {
            data: null,
            cssCode: ""
        },
        window: {
            main: null,
            editor: null
        },
        hmr: {
            setter: null,
            importing: null,
            isActive: false
        },
        device: {
            isVscodeInstalled: null
        }
    };
}
