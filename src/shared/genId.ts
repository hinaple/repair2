import { randomBytes } from "crypto";

export function genId(len = 20) {
    return randomBytes(len).toString("hex");
}
