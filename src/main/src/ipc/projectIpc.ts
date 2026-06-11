import type { EditorInitialData } from "@shared/projectData.types";
import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";

export function setupProjectIpc(app: MainApp) {
    ipc.on("config:is-dev", (evt) => {
        evt.returnValue = !!app.state.project.data?.config?.devMode;
    });

    ipc.on("request-data", (evt) => {
        evt.returnValue = {
            ...app.state.project.data,
            globalStyles: app.state.project.cssCode
        } as EditorInitialData;
    });

    ipc.handle("update-data", (evt, tempData) => {
        app.message.sendToPlay("data", {
            ...tempData,
            globalStyles: app.state.project.cssCode
        });
        return app.controllers.project.saveData(tempData);
    });
}
