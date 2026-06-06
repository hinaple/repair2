import type { Socket } from "socket.io-client";
import { cli } from "../console";

type SocketIo = typeof import("socket.io-client").io;
type SocketConnectResult =
    | {
          succeed: true;
          socket: Socket;
      }
    | {
          succeed: false;
      };
type SocketDataHandler = (channel: string, data: unknown, url: string) => void;

let io: SocketIo | null = null;
async function getIo() {
    if (!io) io = (await import("socket.io-client")).io;
    return io;
}

async function tryToConnect(url: string): Promise<SocketConnectResult> {
    const socket = (await getIo())(url);

    return new Promise((resolve) => {
        socket.on("connect", () => {
            resolve({ succeed: true, socket });
            socket.removeAllListeners();
        });
        socket.on("connect_error", () => {
            resolve({ succeed: false });
            socket.removeAllListeners();
            socket.disconnect();
        });
    });
}

export default class SocketConnector {
    connected = false;
    socket: Socket | null = null;
    url: string | null = null;

    #ondata: SocketDataHandler;

    constructor(ondata: SocketDataHandler) {
        this.#ondata = ondata;
    }

    async connect(urls: string | string[]) {
        const targetUrls = Array.isArray(urls) ? urls : [urls];
        if (this.socket && this.connected) return true;
        else if (this.socket) this.disconnect();

        for (const url of targetUrls) {
            const result = await tryToConnect(url);
            if (result.succeed) {
                this.url = url;
                this.socket = result.socket;
                this.connected = true;
                this.#ondata("connect", null, url);
                this.socket.onAny((channel, data) => {
                    if (channel === "disconnect" || channel === "connect_error")
                        this.connected = false;
                    if (channel === "connect") this.connected = true;
                    this.#ondata(channel, data, url);
                });
                return true;
            }
        }
        return false;
    }

    send(channel: string, ...data: unknown[]) {
        if (!channel) return;

        if (!this.socket) {
            cli.warning("Socket.id", "No socket connection");
            return;
        }
        this.socket.emit(channel, ...data);
    }

    disconnect() {
        if (!this.socket) return;
        this.socket.disconnect();
        this.socket = null;
    }
}
