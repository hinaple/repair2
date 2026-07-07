import type { RecordKey } from "@shared/constants";

type CopyMapType = { copy?: boolean; remove?: boolean; paste?: boolean };

export const CopyMap = {
  project: { copy: false, remove: false },
  listener: { paste: false },
  element: {},
  step: { paste: false },
  valueProcess: { paste: false },
  value: { remove: false },
  sequence: {},
  entry: { paste: false },
  branch: { paste: false },
  variableSet: { paste: false }
} as const satisfies Partial<Record<string, CopyMapType>>;
