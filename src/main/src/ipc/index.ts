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
import type { MainApp } from "../app/mainApp";

export function setupIpcHandlers(app: MainApp) {
    setupShellIpc(app);
    setupLogIpc(app);
    setupPluginIpc(app);
    setupProjectIpc(app);
    setupEditorIpc(app);
    setupAssetIpc(app);
    setupPreviewIpc(app);
    setupCommunicationIpc(app);
    setupMonitorIpc(app);
    setupStoreIpc(app);
}
