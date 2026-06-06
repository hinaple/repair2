import { ipcMain } from "electron";
import type { SerialService, SocketService } from "../app/mainContext.types";

type CommunicationIpcOptions = {
    socket: SocketService;
    serial: SerialService;
    sendToEditor: (channel: string, ...params: unknown[]) => void;
};

export function setupCommunicationIpc({ socket, serial, sendToEditor }: CommunicationIpcOptions) {
    ipcMain.on("socket-connect", (event, urls: string | string[]) => {
        socket
            .connect(typeof urls === "string" ? urls.trim().split("\n") : urls)
            .then((connected) => {
                if (!connected) sendToEditor("socket-failed");
            });
    });

    ipcMain.on("socket-connect-service", (event, type: string, name: string) => {
        if (socket.connected) return;
        import("../communication/bonjour.js")
            .then(({ findService }) => findService(type, name))
            .then((urls) => {
                socket.connect(urls).then((connected) => {
                    if (!connected) sendToEditor("socket-failed");
                });
            })
            .catch(() => {});
    });

    ipcMain.on("socket-send", (event, channel: string, ...data: unknown[]) => {
        socket.send(channel, ...data);
    });
    ipcMain.on("socket-disconnect", () => {
        socket.disconnect();
    });

    ipcMain.on("serial-open", (event, alias?: string, port?: string, baudRate?: number) => {
        serial.open(alias, port, baudRate);
    });
    ipcMain.on("serial-send", (event, data: unknown) => {
        serial.send(data);
    });
    ipcMain.on("serial-close", () => {
        serial.close();
    });
}
