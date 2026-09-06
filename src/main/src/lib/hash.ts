import { createHash } from "node:crypto";

export function hashString(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
