import type { RecordKey, RecordValue } from "../../constants";
import type { RuntimeProjectData } from "../types";
import { isRelationLeaf, isRelationTree, KIND, RelationMap, TYPE } from "./map";
import type {
  RelationLeaf,
  RelationMapType,
  RelationRootData,
  RelationRootKey,
  RelationTree
} from "./map";

export interface ForEachOpt {
  includes?: RecordKey[];
  includePath?: boolean;
  maxLevel?: number;
  onlyOwns?: boolean;
}

export type ForEachRelationIdOpt = Pick<ForEachOpt, "includes" | "includePath" | "onlyOwns">;

export type DeepForEachCallback = <R extends RecordKey>(d: {
  type: R;
  id: string;
  data: RecordValue<R>;
  owned: boolean;
  level: number;
  via: DeepForEachVia | null;
}) => unknown;

export type DeepForEachVia = {
  type: RecordKey;
  id: string;
  path?: string[];
  kind: KIND;
};

export type ForEachRelationIdCallback = <R extends RecordKey>(d: {
  type: R;
  id: string;
  owned: boolean;
  path?: string[];
  kind: KIND;
}) => unknown;

type WalkContext = {
  project: RuntimeProjectData;
  callback: DeepForEachCallback;
  opt: ForEachOpt;
  includes?: Set<RecordKey>;
  includePath: boolean;
  visited: Set<string>;
};

type RelationIdWalkContext = {
  callback: ForEachRelationIdCallback;
  opt: ForEachRelationIdOpt;
  includes?: Set<RecordKey>;
  includePath: boolean;
};

type VisitState = {
  level: number;
  owned: boolean;
  via: DeepForEachVia | null;
};

type RelationIdWalkState = {
  path?: string[];
};

export function forEachRelationId<K extends RelationRootKey>(
  type: K,
  data: RelationRootData<K>,
  callback: ForEachRelationIdCallback,
  opt: ForEachRelationIdOpt = {}
) {
  const map = (RelationMap as RelationMapType)[type];
  if (!map) return;
  walkMap(
    {
      callback,
      opt,
      includes: opt.includes ? new Set(opt.includes) : undefined,
      includePath: opt.includePath === true
    },
    data,
    map,
    { path: opt.includePath === true ? [] : undefined }
  );
}

export function deepForEach(
  project: RuntimeProjectData,
  type: RecordKey,
  id: string | null,
  callback: DeepForEachCallback,
  opt: ForEachOpt = {}
) {
  dfe(
    {
      project,
      callback,
      opt,
      includes: opt.includes ? new Set(opt.includes) : undefined,
      includePath: opt.includePath === true,
      visited: new Set()
    },
    type,
    id,
    { level: 0, owned: false, via: null }
  );
}

function dfe(ctx: WalkContext, type: RecordKey, id: string | null, state: VisitState) {
  if (!id) return;
  const visitKey = `${type}:${id}`;
  if (ctx.visited.has(visitKey)) return;
  ctx.visited.add(visitKey);

  const data = ctx.project[type].get(id);
  if (!data) return;
  ctx.callback({ type, id, data, ...state });

  if (ctx.opt.maxLevel !== undefined && state.level >= ctx.opt.maxLevel) return;

  const map = (RelationMap as RelationMapType)[type];
  if (!map) return;
  walkMap(
    {
      callback: ({ type: relationType, id: relationId, owned, path, kind }) => {
        dfe(ctx, relationType, relationId, {
          level: state.level + 1,
          owned,
          via: {
            type,
            id,
            ...(path !== undefined ? { path } : {}),
            kind
          }
        });
      },
      opt: ctx.opt,
      includes: ctx.includes,
      includePath: ctx.includePath
    },
    data,
    map,
    { path: ctx.includePath ? [] : undefined }
  );
}

function walkMap(
  ctx: RelationIdWalkContext,
  data: unknown,
  map: RelationTree,
  state: RelationIdWalkState
) {
  if (!isRecord(data)) return;

  if (map.$dependsOn && map.$cases) {
    const caseKey = data[map.$dependsOn];
    if (typeof caseKey === "string") {
      const caseMap = map.$cases[caseKey];
      if (caseMap) walkMap(ctx, data, caseMap, state);
    }
  }

  for (const key in map) {
    if (key === "$dependsOn" || key === "$cases") continue;

    const relation = map[key];
    const value = data[key];
    if (state.path) state.path.push(key);
    if (isRelationLeaf(relation)) {
      followRelation(ctx, state, relation, value);
      if (state.path) state.path.pop();
      continue;
    }

    if (isRelationTree(relation)) {
      walkMap(ctx, value, relation, state);
    }

    if (state.path) state.path.pop();
  }
}

function followRelation(
  ctx: RelationIdWalkContext,
  state: RelationIdWalkState,
  relation: RelationLeaf,
  value: unknown
) {
  const owned = relation.$kind === KIND.OWN;
  if (ctx.opt.onlyOwns && !owned) return;
  if (ctx.includes && !ctx.includes.has(relation.$key)) return;

  if (relation.$type === TYPE.ID) {
    if (typeof value === "string") {
      ctx.callback({
        type: relation.$key,
        id: value,
        owned,
        ...(ctx.includePath && state.path ? { path: [...state.path] } : {}),
        kind: relation.$kind
      });
    }
    return;
  }

  if (relation.$type === TYPE.ID_ARRAY && Array.isArray(value)) {
    for (const id of value) {
      if (typeof id === "string") {
        ctx.callback({
          type: relation.$key,
          id,
          owned,
          ...(ctx.includePath && state.path ? { path: [...state.path] } : {}),
          kind: relation.$kind
        });
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
