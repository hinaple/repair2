import type { Data as V1Data } from "./v1Data.types";
import type { Data as StoredProjectData, ProjectConfig } from "./v2Data.types";
import type * as Types from "./v2Data.types";
import type { RuntimeProjectData } from "./runtimeData/base.types";

type EditorInitialData = RuntimeProjectData & {
  globalStyles: string;
};
type PossibleStoredData = V1Data | StoredProjectData | null;

export type {
  Types,
  StoredProjectData,
  RuntimeProjectData,
  ProjectConfig,
  EditorInitialData,
  V1Data,
  PossibleStoredData
};
