import { app } from "electron";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const LogDir = join(app.getPath("userData"), "logs");
const logDirReady = mkdir(LogDir, { recursive: true });

function dateFormat(date: Date) {
    return [
        date.getFullYear(),
        (date.getMonth() + 1).toString().padStart(2, "0"),
        date.getDate().toString().padStart(2, "0"),
        date.getHours().toString().padStart(2, "0"),
        date.getMinutes().toString().padStart(2, "0"),
        `${date.getSeconds().toString().padStart(2, "0")}.${date.getMilliseconds()}`
    ].join("-");
}

export default async function makeLogFile(type: string, content: string) {
    await logDirReady;
    const filepath = join(LogDir, `${type}_${dateFormat(new Date())}.txt`);
    await writeFile(filepath, content);
    return filepath;
}
