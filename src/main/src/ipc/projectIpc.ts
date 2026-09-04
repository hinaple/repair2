import type { MainApp } from "../app/mainApp";
import { logger } from "../logs/logger";
import { ipc } from "./ipcMethods";

export function setupProjectIpc(app: MainApp) {
  ipc.on("config:is-dev", (evt) => {
    evt.returnValue = !!app.state.project.data?.config?.devMode;
  });

  ipc.on("request-data", (evt) => {
    evt.returnValue = {
      ...app.state.project.data,
      globalStyles: app.state.project.cssCode
    };
  });

  ipc.handle("update-data", async (evt, tempData) => {
    const saved = await app.controllers.project.saveData(tempData);
    try {
      await app.service.pluginManager?.mainRuntime.restart();
    } catch (error) {
      logger.error("Runtime plugin utility process restart failed.", error as any);
    }
    app.message.sendToPlay("data", {
      ...tempData,
      globalStyles: app.state.project.cssCode
    });
    return saved;
  });
}
