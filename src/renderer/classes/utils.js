import { randomBytes } from "crypto";

export function genId() {
    return randomBytes(20).toString("hex");
}
