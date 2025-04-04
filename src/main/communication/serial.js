import { SerialPort } from "serialport";

export default class SerialConnector {
    constructor(ondata) {
        this.port = null;
        this.ondata = ondata;
    }

    async open(portAlias, path, baudRate = 9600) {
        if (this.port) this.port.close();

        let realPort = path;

        if (portAlias || !path) {
            const list = await SerialPort.list();
            realPort =
                list.find((p) => p.friendlyName.includes(portAlias || "USB-SERIAL"))?.path ?? path;
        }

        if (!realPort) return;

        this.port = new SerialPort({
            path: realPort,
            baudRate: baudRate ?? 9600
        });

        console.log("SERIAL OPENED: ", realPort);

        this.port.on("readable", () => {
            const data = this.port.read();
            this.ondata?.(data.toString().trim());
        });
    }

    send(data) {
        if (!this.port) {
            console.log("No port connection");
            return;
        }
        this.port.write(data.toString());
    }

    close() {
        if (!this.port) return;
        this.port.close();
        this.port = null;
    }
}
