import { SerialPort } from "serialport";
import { logger } from "../logs/logger";

type SerialDataHandler = (data: string) => void;
type SerialConnectHandler = (port: string) => void;

export default class SerialConnector {
    port: SerialPort | null = null;

    #onconnect: SerialConnectHandler;
    #ondata: SerialDataHandler;

    constructor(ondata: SerialDataHandler, onconnect: SerialConnectHandler) {
        this.#ondata = ondata;
        this.#onconnect = onconnect;
    }

    async open(portAlias?: string, path?: string, baudRate = 9600) {
        if (this.port?.isOpen) this.port.close();

        let realPort = path;

        if (portAlias || !path) {
            const list = await SerialPort.list();
            realPort =
                list.find((port) => port.friendlyName?.includes(portAlias || "USB-SERIAL"))?.path ??
                path;
        }

        if (!realPort) return;

        this.port = new SerialPort({
            path: realPort,
            baudRate: baudRate ?? 9600
        });

        logger.info("SERIAL OPENED: ", realPort);
        this.#onconnect(realPort);

        this.port.on("readable", () => {
            const data = this.port?.read();
            if (!data) return;
            this.#ondata(data.toString().trim());
        });
    }

    send(data: unknown) {
        if (!this.port) {
            logger.warning("SerialPort", "No port connection");
            return;
        }
        this.port.write(String(data));
    }

    close() {
        if (!this.port || !this.port.isOpen) return;
        this.port.close();
        this.port = null;
    }
}
