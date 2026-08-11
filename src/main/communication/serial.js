import { SerialPort } from "serialport";
import { app } from "electron";
import fs from "node:fs";
import { join } from "node:path";

const logPath = join(app.getPath("desktop"), "repair2_serial_log.txt");

function serialLog(message) {
    try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\r\n`, "utf8");
    } catch (err) {
        console.error("Serial log write failed:", err);
    }
}

function errorToString(err) {
    if (!err) return "none";
    return err.stack || err.message || String(err);
}

export default class SerialConnector {
    constructor(ondata, onconnect) {
        this.port = null;
        this.ondata = ondata;
        this.onconnect = onconnect;

        // 마지막으로 정상적으로 요청했던 연결 정보
        this.lastOpenOptions = null;

        // 중복 recovery 방지
        this.recovering = false;
        this.recoveryTimer = null;

        // 사용자가 close()를 호출한 경우 자동 재연결 방지
        this.manualClose = false;

        serialLog("========== SerialConnector CREATED ==========");
    }

    async open(portAlias, path, baudRate = 9600) {
        this.manualClose = false;

        // 자동 복구 때 사용할 연결 정보 저장
        this.lastOpenOptions = {
            portAlias,
            path,
            baudRate
        };

        serialLog(
            `OPEN CALLED alias=${JSON.stringify(portAlias)} ` +
                `path=${JSON.stringify(path)} ` +
                `baudRate=${baudRate}`
        );

        // 기존 동작 유지
        if (this.port?.isOpen) {
            serialLog(`PREVIOUS PORT CLOSE REQUEST path=${this.port.path}`);

            this.port.close();
        }

        let realPort = path;

        if (portAlias || !path) {
            try {
                const list = await SerialPort.list();

                serialLog(`PORT LIST ${JSON.stringify(list)}`);

                realPort =
                    list.find((p) => p.friendlyName?.includes(portAlias || "USB-SERIAL"))?.path ??
                    path;
            } catch (err) {
                serialLog(`PORT LIST ERROR ${errorToString(err)}`);

                throw err;
            }
        }

        if (!realPort) {
            serialLog("OPEN ABORTED: realPort not found");
            return;
        }

        serialLog(`CREATE PORT path=${realPort} ` + `baudRate=${baudRate ?? 9600}`);

        const port = new SerialPort({
            path: realPort,
            baudRate: baudRate ?? 9600
        });

        this.port = port;

        console.log("SERIAL OPENED: ", realPort);

        serialLog(`SERIAL PORT CREATED path=${realPort}`);

        // 기존 호출 타이밍 유지
        this.onconnect(realPort);

        port.on("open", () => {
            serialLog(`PORT OPEN EVENT ` + `path=${realPort} ` + `isOpen=${port.isOpen}`);

            /*
             * 재연결이 성공했으면 recovery 상태 해제
             */
            if (this.port === port) {
                if (this.recovering) {
                    serialLog(`RECOVERY SUCCESS path=${realPort}`);
                }

                this.recovering = false;
            }
        });

        port.on("readable", () => {
            serialLog(
                `READABLE EVENT ` +
                    `path=${realPort} ` +
                    `isOpen=${port.isOpen} ` +
                    `readableLength=${port.readableLength}`
            );

            const data = port.read();

            if (data === null) {
                serialLog(`READ RETURNED NULL path=${realPort}`);
                return;
            }

            serialLog(
                `RX ` +
                    `path=${realPort} ` +
                    `bytes=${data.length} ` +
                    `hex=${data.toString("hex")} ` +
                    `text=${JSON.stringify(data.toString())}`
            );

            const text = data.toString().trim();

            serialLog(`ONDATA CALL ${JSON.stringify(text)}`);

            try {
                this.ondata?.(text);

                serialLog("ONDATA RETURNED");
            } catch (err) {
                serialLog(`ONDATA ERROR ${errorToString(err)}`);

                throw err;
            }
        });

        port.on("error", (err) => {
            const message = errorToString(err);

            serialLog(
                `PORT ERROR ` + `path=${realPort} ` + `isOpen=${port.isOpen} ` + `error=${message}`
            );

            /*
             * 지금 실제로 관측된 오류만 자동 복구 대상으로 삼는다.
             */
            if (this.port === port && this.isRecoverableError(err)) {
                serialLog(`RECOVERABLE ERROR DETECTED path=${realPort}`);

                if (this.recovering) {
                    this.recovering = false;
                }

                this.scheduleRecovery(port);
            }
        });

        port.on("close", (err) => {
            serialLog(
                `PORT CLOSE EVENT ` +
                    `path=${realPort} ` +
                    `isOpen=${port.isOpen} ` +
                    `disconnected=${err?.disconnected ?? false} ` +
                    `error=${errorToString(err)}`
            );

            /*
             * 실제 USB disconnect까지 자동 복구 대상으로 포함.
             *
             * error와 close가 둘 다 발생해도
             * scheduleRecovery() 내부에서 중복을 막는다.
             */
            if (this.port === port && !this.manualClose && err?.disconnected) {
                serialLog(`UNEXPECTED DISCONNECT DETECTED path=${realPort}`);

                this.scheduleRecovery(port);
            }
        });
    }

    /*
     * 현재 실제로 관측된 문제인지 판별.
     *
     * 모든 error를 자동 재연결하지 않는 것이 중요하다.
     */
    isRecoverableError(err) {
        const message = (err?.message || String(err)).toLowerCase();

        return (
            (message.includes("access denied") && message.includes("reading from com port")) ||
            message.includes("file not found")
        );
    }

    /*
     * SerialPort 객체 자체를 버리고 새로 만든다.
     *
     * 단순 port.open()보다 새 SerialPort를 만드는 이유:
     * 현재 증상은 프로그램 재시작 시 해결되고 있으므로
     * 기존 native handle / stream 상태까지 버리는 쪽이
     * 실제 수동 복구 동작에 더 가깝다.
     */
    scheduleRecovery(failedPort) {
        if (this.manualClose) return;

        if (this.recovering) {
            serialLog("RECOVERY ALREADY IN PROGRESS");
            return;
        }

        if (!this.lastOpenOptions) {
            serialLog("RECOVERY FAILED: no previous open options");
            return;
        }

        this.recovering = true;

        serialLog(`RECOVERY START ` + `path=${failedPort?.path ?? "unknown"}`);

        /*
         * 기존 객체를 현재 포트에서 먼저 분리.
         *
         * 이후 failedPort에서 error/close가 추가로 발생해도
         * 현재 포트로 취급되지 않는다.
         */
        if (this.port === failedPort) {
            this.port = null;
        }

        const reopen = () => {
            if (this.manualClose) {
                this.recovering = false;
                return;
            }

            /*
             * Windows / CH341 드라이버가 기존 handle을
             * 정리할 시간을 조금 준다.
             */
            this.recoveryTimer = setTimeout(async () => {
                this.recoveryTimer = null;

                if (this.manualClose) {
                    this.recovering = false;
                    return;
                }

                const { portAlias, path, baudRate } = this.lastOpenOptions;

                serialLog(
                    `RECOVERY REOPEN ` +
                        `alias=${JSON.stringify(portAlias)} ` +
                        `path=${JSON.stringify(path)} ` +
                        `baudRate=${baudRate}`
                );

                /*
                 * open() 내부에서 새 SerialPort 객체 생성.
                 *
                 * 여기서 recovering=true인 상태이므로
                 * 중복 recovery는 차단된다.
                 */
                try {
                    await this.open(portAlias, path, baudRate);
                } catch (err) {
                    serialLog(`RECOVERY OPEN ERROR ${errorToString(err)}`);

                    this.recovering = false;
                }
            }, 1000);
        };

        /*
         * 아직 Windows 기준 포트가 열린 상태면
         * close 요청을 먼저 한다.
         */
        if (failedPort?.isOpen) {
            serialLog(`RECOVERY CLOSE REQUEST path=${failedPort.path}`);

            try {
                failedPort.close((err) => {
                    if (err) {
                        serialLog(`RECOVERY CLOSE ERROR ` + `${errorToString(err)}`);
                    } else {
                        serialLog(`RECOVERY CLOSE OK path=${failedPort.path}`);
                    }

                    reopen();
                });
            } catch (err) {
                serialLog(`RECOVERY CLOSE EXCEPTION ` + `${errorToString(err)}`);

                reopen();
            }
        } else {
            serialLog(`RECOVERY PORT ALREADY CLOSED ` + `path=${failedPort?.path ?? "unknown"}`);

            reopen();
        }
    }

    send(data) {
        if (!this.port) {
            serialLog(`TX FAILED: NO PORT ` + `data=${JSON.stringify(data?.toString())}`);

            console.log("No port connection");
            return;
        }

        const port = this.port;
        const text = data.toString();

        serialLog(
            `TX ` +
                `path=${port.path} ` +
                `isOpen=${port.isOpen} ` +
                `bytes=${Buffer.byteLength(text)} ` +
                `hex=${Buffer.from(text).toString("hex")} ` +
                `text=${JSON.stringify(text)}`
        );

        // 기존 동작 그대로
        port.write(data.toString());
    }

    close() {
        this.manualClose = true;
        this.recovering = false;

        if (this.recoveryTimer) {
            clearTimeout(this.recoveryTimer);
            this.recoveryTimer = null;
        }

        const port = this.port;

        serialLog(
            `CLOSE CALLED ` + `path=${port?.path ?? "null"} ` + `isOpen=${port?.isOpen ?? false}`
        );

        if (!port || !port.isOpen) return;

        port.close();
        this.port = null;
    }
}
