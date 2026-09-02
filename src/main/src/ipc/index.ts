import { setupAssetIpc } from "./assetIpc";
import { setupCommunicationIpc } from "./communicationIpc";
import { setupEditorIpc } from "./editorIpc";
import { setupLogIpc } from "./logIpc";
import { setupMonitorIpc } from "./monitorIpc";
import { setupMessagePortIpc } from "./messagePortIpc";
import { setupPluginIpc } from "./pluginIpc";
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
  setupCommunicationIpc(app);
  setupMonitorIpc(app);
  setupMessagePortIpc(app);
  setupStoreIpc(app);
}
