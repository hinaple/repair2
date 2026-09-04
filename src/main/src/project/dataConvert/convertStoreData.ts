import { PROJECT_RECORDS } from "@shared/constants";
import type { RuntimeProjectData, StoredProjectData } from "@shared/projectData/types";

function recordToMap<K extends string, T>(record: Record<K, T>) {
  return new Map(Object.entries(record)) as Map<K, T>;
}
function mapToRecord<K extends string, T>(map: Map<K, T>) {
  return Object.fromEntries(map.entries()) as Record<K, T>;
}

export function convertToRuntime(data: StoredProjectData): RuntimeProjectData {
  const newData: any = { ...data };
  Object.keys(PROJECT_RECORDS).forEach((k) => {
    newData[k] = recordToMap(newData[k]);
  });
  return newData;
}
export function convertToStored(data: RuntimeProjectData): StoredProjectData {
  const newData: any = { ...data };
  Object.keys(PROJECT_RECORDS).forEach((k) => {
    newData[k] = mapToRecord(newData[k]);
  });
  return newData;
}
