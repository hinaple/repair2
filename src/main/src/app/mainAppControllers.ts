import { PluginHmrController } from "../controllers/pluginHmrController";
import { ProjectController } from "../controllers/projectController";
import { WindowController } from "../windows/windowController";
import type { MainControllers } from "./mainApp.types";
import type { MainApp } from "./mainApp";

export function createControllers(app: MainApp): MainControllers {
    return {
        pluginHmr: new PluginHmrController(app),
        project: new ProjectController(app),
        window: new WindowController(app)
    };
}
