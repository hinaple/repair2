import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";
import { logger } from "../logs/logger";

export function setupMonitorIpc(app: MainApp) {
  ipc.on("custom-log", (evt, content) => {
    logger
      .with({
        source: "project",
        type: "project-custom-log",
        subject: { kind: "project" },
        phase: "runtime"
      })
      .info(content);
  });
}
