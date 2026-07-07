import type { RecordKey, RecordValue } from "../../constants";
import type { RuntimeProjectData } from "../types";
import { isRelationLeaf, isRelationTree, KIND, RelationMap, TYPE } from "./map";
import type { RelationLeaf, RelationMapType, RelationTree } from "./map";

export interface ForEachOpt {
  includes?: RecordKey[];
  maxLevel?: number;
  onlyOwns?: boolean;
}

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
  path: string[];
  kind: KIND;
};

type WalkContext = {
  project: RuntimeProjectData;
  callback: DeepForEachCallback;
  opt: ForEachOpt;
  includes?: Set<RecordKey>;
  visited: Set<string>;
};

type VisitState = {
  level: number;
  owned: boolean;
  via: DeepForEachVia | null;
};

type RelationSource = {
  type: RecordKey;
  id: string;
};

type MapWalkState = {
  source: RelationSource;
  level: number;
  path: string[];
};

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
  if (!ctx.includes || ctx.includes.has(type)) {
    ctx.callback({ type, id, data, ...state });
  }

  if (ctx.opt.maxLevel !== undefined && state.level >= ctx.opt.maxLevel) return;

  const map = (RelationMap as RelationMapType)[type];
  if (!map) return;
  walkMap(ctx, data, map, {
    source: { type, id },
    level: state.level,
    path: []
  });
}

function walkMap(ctx: WalkContext, data: unknown, map: RelationTree, state: MapWalkState) {
  if (!isRecord(data)) return;

  if (map.$dependsOn && map.$cases) {
    const caseKey = data[map.$dependsOn];
    if (typeof caseKey === "string") {
      const caseMap = map.$cases[caseKey];
      if (caseMap) walkMap(ctx, data, caseMap, state);
    }
  }

  for (const [key, relation] of Object.entries(map)) {
    if (key === "$dependsOn" || key === "$cases") continue;

    const value = data[key];
    const nextState = { ...state, path: [...state.path, key] };
    if (isRelationLeaf(relation)) {
      followRelation(ctx, nextState, relation, value);
      continue;
    }

    if (isRelationTree(relation)) {
      walkMap(ctx, value, relation, nextState);
    }
  }
}

function followRelation(
  ctx: WalkContext,
  state: MapWalkState,
  relation: RelationLeaf,
  value: unknown
) {
  const owned = relation.$kind === KIND.OWN;
  if (ctx.opt.onlyOwns && !owned) return;

  if (relation.$type === TYPE.ID) {
    if (typeof value === "string") {
      dfe(ctx, relation.$key, value, createNextVisitState(state, owned, relation.$kind));
    }
    return;
  }

  if (relation.$type === TYPE.ID_ARRAY && Array.isArray(value)) {
    const nextVisitState = createNextVisitState(state, owned, relation.$kind);
    for (const id of value) {
      if (typeof id === "string") {
        dfe(ctx, relation.$key, id, nextVisitState);
      }
    }
  }
}

function createNextVisitState(state: MapWalkState, owned: boolean, kind: KIND): VisitState {
  return {
    level: state.level + 1,
    owned,
    via: {
      ...state.source,
      path: state.path,
      kind
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
