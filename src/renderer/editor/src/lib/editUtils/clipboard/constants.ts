import type { RecordValue, SINGULAR_RECORD_MAP } from "@shared/constants";
import type { Types } from "@shared/projectData/types";
import type { ExtractResult } from "../extractData";
import { typedIncludes } from "@shared/utils.types";

export const ClipboardFormat = "application/x-repair2-clipboard-binary";

export type CopyMapType = { copy?: boolean; remove?: boolean; paste?: boolean };

export const CopyMap = {
  project: { copy: false, remove: false },
  entry: { paste: false },
  branch: { paste: false },
  variableSet: { paste: false },
  value: { remove: false, copy: false },
  valueProcess: { paste: false },
  sequence: {},
  step: { paste: false },
  component: { copy: false, remove: false },
  element: {},
  listener: { paste: false }
} as const satisfies Record<string, CopyMapType>;

const CONTEXT_NODE_TYPES = ["sequence", "entry", "branch", "variableSet"] as const;

export const CONTEXT_FOCUS_TYPE_MAP = Object.fromEntries(
  Object.keys(CopyMap).map((t) => [t, typedIncludes(CONTEXT_NODE_TYPES, t) ? "node" : t])
) as {
  [k in keyof typeof CopyMap]: k extends (typeof CONTEXT_NODE_TYPES)[number] ? "node" : k;
};

export type Copiable =
  | Exclude<
      {
        [K in keyof typeof CopyMap]: (typeof CopyMap)[K] extends { copy: false } ? never : K;
      }[keyof typeof CopyMap],
      (typeof CONTEXT_NODE_TYPES)[number]
    >
  | "node"
  | "nodes";

export type Removable =
  | Exclude<
      {
        [K in keyof typeof CopyMap]: (typeof CopyMap)[K] extends { remove: false } ? never : K;
      }[keyof typeof CopyMap],
      (typeof CONTEXT_NODE_TYPES)[number]
    >
  | "node"
  | "nodes";

type CopiedSingleData<T extends Exclude<Copiable, "nodes">> = RecordValue<
  (typeof SINGULAR_RECORD_MAP)[T]
>;

export type CopiedDataMap = {
  [K in Exclude<Copiable, "nodes">]: {
    REPAIR_VERSION: string;
    type: K;
    data: CopiedSingleData<K>;
    owned: ExtractResult;
  };
} & {
  nodes: {
    REPAIR_VERSION: string;
    type: "nodes";
    data: Types.Node[];
    owned: ExtractResult;
  };
};

export type CopiedData = CopiedDataMap[keyof CopiedDataMap];

type Pastable = {
  [K in keyof typeof CopyMap]: (typeof CopyMap)[K] extends { paste: false } ? never : K;
}[keyof typeof CopyMap];

export const ClipboardOwnMap = {
  nodes: true,
  node: true,
  valueProcess: ["value", "process"],
  step: ["sequence", "steps"],
  element: ["component", "elements"],
  listener: ["element", "listeners"]
} as const satisfies Record<Copiable, true | [Pastable, string]>;
