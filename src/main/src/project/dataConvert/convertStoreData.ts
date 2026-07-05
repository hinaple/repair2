import { RuntimeProjectData, StoredProjectData } from "@shared/projectData/types";

const RecordKeys = [
  "resources",
  "variables",
  "nodes",
  "steps",
  "components",
  "elements",
  "listeners",
  "valueProcesses",
  "pluginPointers",
  "values"
] as const;

function recordToMap<K extends string, T>(record: Record<K, T>) {
  return new Map(Object.entries(record)) as Map<K, T>;
}
function mapToRecord<K extends string, T>(map: Map<K, T>) {
  return Object.fromEntries(map.entries()) as Record<K, T>;
}

export function convertToRuntime(data: StoredProjectData): RuntimeProjectData {
  const newData: any = { ...data };
  RecordKeys.forEach((k) => {
    newData[k] = recordToMap(newData[k]);
  });
  return newData;
}
export function convertToStored(data: RuntimeProjectData): StoredProjectData {
  const newData: any = { ...data };
  RecordKeys.forEach((k) => {
    newData[k] = mapToRecord(newData[k]);
  });
  return newData;
}
