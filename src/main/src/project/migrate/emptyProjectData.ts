import { createProject } from "@shared/projectData/factories";
import type { StoredProjectData } from "@shared/projectData/types";

export function makeEmptyProjectData(appVersion: string): StoredProjectData {
  return createProject({ appVersion });
}
