import { createProjectCustomLogReporter } from "../logs/projectLog";
import { setupAssetIpc } from "./assetIpc";
import { setupCommunicationIpc } from "./communicationIpc";
import { setupEditorIpc } from "./editorIpc";
import { setupLogIpc } from "./logIpc";
import { setupMonitorIpc } from "./monitorIpc";
import { setupPluginIpc } from "./pluginIpc";
import { setupPreviewIpc } from "./previewIpc";
import { setupProjectIpc } from "./projectIpc";
import { setupShellIpc } from "./shellIpc";
import { setupStoreIpc } from "./storeIpc";
import type { MainContext } from "../app/mainContext.types";
import type { ProjectData } from "@shared/projectData.types";

export function setupIpcHandlers({
    state,
    service,
    controllers,
    message,
    log,
    paths,
    store
}: MainContext) {
    const reportProjectCustomLog = createProjectCustomLogReporter(log.reportLog);

    setupShellIpc();
    setupLogIpc({
        sendToEditor: message.sendToEditor,
        reportLog: log.reportLog
    });
    setupPluginIpc({
        getPluginManager: () => service.pluginManager,
        getDialogOwnerWindow: () => state.window.editor ?? state.window.main
    });
    setupProjectIpc({
        getData: () => state.project.data,
        getGlobalCss: () => state.project.cssCode,
        saveData: (data: ProjectData) => controllers.project.saveData(data),
        sendToMain: message.sendToMain
    });
    setupEditorIpc({
        getEditorWindow: () => state.window.editor,
        createEditorWindow: () => controllers.window.createEditorWindow()
    });
    setupAssetIpc({
        assetDir: paths.assetDir,
        dataDir: paths.dataDir,
        getDialogOwnerWindow: () => state.window.editor ?? state.window.main
    });
    setupPreviewIpc({
        sendToMain: message.sendToMain
    });
    setupCommunicationIpc({
        socket: service.socket,
        serial: service.serial,
        sendToEditor: message.sendToEditor
    });
    setupMonitorIpc({
        sendToMain: message.sendToMain,
        sendToEditor: message.sendToEditor,
        reportProjectCustomLog
    });
    setupStoreIpc({
        getStore: store.getStore
    });
}
