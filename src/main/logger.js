import { app } from "electron";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const LogDir = join(app.getPath("userData"), "logs");
mkdir(LogDir, { recursive: true });

function dateFormat(date) {
    return [
        date.getFullYear(),
        (date.getMonth() + 1).toString().padStart(2, "0"),
        date.getDate().toString().padStart(2, "0"),
        date.getMinutes().toString().padStart(2, "0"),
        `${date.getSeconds().toString().padStart(2, "0")}.${date.getMilliseconds()}`
    ].join("-");
}

export default async function makeLog(type, content) {
    const filepath = join(LogDir, `${type}_${dateFormat(new Date())}.txt`);
    await writeFile(filepath, content);
    return filepath;
}
