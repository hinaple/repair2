import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";
import { logger } from "../logs/logger";

export function setupMonitorIpc(app: MainApp) {
    ipc.on("monitor-event", (event, ...data) => {
        app.message.sendToPlay("monitor-event", ...data);
    });
    ipc.on("monitor-info", (event, ...data) => {
        app.message.sendToEditor("monitor-info", ...data);
    });

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
