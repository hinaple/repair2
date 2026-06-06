import fs from "fs/promises";

export function pathExists(path: string) {
    return fs
        .access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

export async function isDirEmpty(path: string) {
    return (await fs.readdir(path, { recursive: false })).length === 0;
}
