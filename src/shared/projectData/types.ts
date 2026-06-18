import type { Data as V1Data } from "./v1Data.types";
import type { Data as ProjectData, ProjectConfig } from "./v2Data.types";
type EditorInitialData = ProjectData & {
    globalStyles: string;
};

export type { ProjectData, ProjectConfig, EditorInitialData, V1Data };
