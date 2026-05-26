import fs from "fs/promises";

export function pathExists(path: string) {
    return fs
        .access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}
