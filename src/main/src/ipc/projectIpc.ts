import type { EditorInitialData, ProjectData } from "@shared/projectData.types";
import { ipc } from "./ipcMethods";

type ProjectIpcOptions = {
    getData: () => ProjectData | null;
    getGlobalCss: () => string;
    saveData: (data: ProjectData) => Promise<boolean>;
    sendToMain: (channel: string, ...params: unknown[]) => void;
};

export function setupProjectIpc({
    getData,
    getGlobalCss,
    saveData,
    sendToMain
}: ProjectIpcOptions) {
    ipc.on("config:is-dev", (evt) => {
        evt.returnValue = !!getData()?.config?.devMode;
    });

    ipc.on("request-data", (evt) => {
        evt.returnValue = { ...getData(), globalStyles: getGlobalCss() } as EditorInitialData;
    });

    ipc.handle("update-data", (evt, tempData: ProjectData) => {
        sendToMain("data", { ...tempData, globalStyles: getGlobalCss() });
        return saveData(tempData);
    });
}
