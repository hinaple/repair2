import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";

export function setupCommunicationIpc(app: MainApp) {
    ipc.on("socket-connect", (event, urls) => {
        app.service.socket
            .connect(typeof urls === "string" ? urls.trim().split("\n") : urls)
            .then((connected) => {
                if (!connected) app.message.sendToEditor("socket-failed");
            });
    });

    ipc.on("socket-connect-service", (event, type, name) => {
        if (app.service.socket.connected) return;
        import("../communication/bonjour.js")
            .then(({ findService }) => findService(type, name))
            .then((urls) => {
                app.service.socket.connect(urls).then((connected) => {
                    if (!connected) app.message.sendToEditor("socket-failed");
                });
            })
            .catch(() => {});
    });

    ipc.on("socket-send", (event, channel, ...data) => {
        app.service.socket.send(channel, ...data);
    });
    ipc.on("socket-disconnect", () => {
        app.service.socket.disconnect();
    });

    ipc.on("serial-open", (event, alias, port, baudRate) => {
        app.service.serial.open(alias, port, baudRate);
    });
    ipc.on("serial-send", (event, data) => {
        app.service.serial.send(data);
    });
    ipc.on("serial-close", () => {
        app.service.serial.close();
    });
}
