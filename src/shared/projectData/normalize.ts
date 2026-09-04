import { createProject } from "./factories";
import type { Types } from "./types";

export function normalizeProjectData(data: Types.Data): Types.Data {
  return createProject(data);
}
