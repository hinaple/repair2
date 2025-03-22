import { io } from "socket.io-client";

export default class SocketConnector {
    constructor(ondata) {
        this.socket = null;
        this.ondata = ondata;
    }
    connect(url) {
        if (this.socket) return;

        this.socket = io(url);

        this.socket.onAny((channel, data) => {
            this.ondata?.(channel, data);
        });
    }

    send(channel, data) {
        if (!channel) return;

        if (!this.socket) {
            console.log("No socket connection");
            return;
        }
        this.socket.emit(channel, data);
    }

    disconnect() {
        if (!this.socket) return;
        this.socket.disconnect();
        this.socket = null;
    }
}
