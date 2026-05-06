import type { RepairUtilsApi } from "./repairUtils.types";

globalThis.RepairUtils = {} as Partial<RepairUtilsApi>;

export function registerUtils<K extends keyof RepairUtilsApi>(key: K, obj: RepairUtilsApi[K]) {
    globalThis.RepairUtils[key] = obj;
}
