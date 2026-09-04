import { genId } from "@shared/genId";
import {
  PROJECT_RECORDS,
  SINGULAR_RECORD_MAP,
  type RecordKey,
  type RecordValue
} from "@shared/constants";
import { isRelationLeaf, isRelationTree, RelationMap, TYPE } from "@shared/projectData/relation";
import type { RelationLeaf, RelationMapType, RelationTree } from "@shared/projectData/relation";
import type { ExtractResult } from "../extractData";
import { getMutator, getProject } from "../../../project/store";
import type { ProjectInstance } from "../../../project/project";
import { ClipboardFormat, ClipboardOwnMap, type Copiable, type CopiedData } from "./constants";
import { currentFocus, focusData, type FocusData } from "../focus";
import { get } from "svelte/store";
import { clipboard } from "electron";
import { unpack } from "msgpackr";
import { viewport } from "../../../nodes/viewport";

export type PasteIdKey = `${RecordKey}:${string}`;
export type PasteIdMap = Map<PasteIdKey, string>;
export type PastePosition = { x: number; y: number };

type PasteRecord = {
  type: RecordKey;
  oldId?: string;
  newId: string;
  data: RecordValue;
  root: boolean;
};

export type PasteResult = {
  rootType: (typeof SINGULAR_RECORD_MAP)[Exclude<CopiedData["type"], "nodes">] | "nodes";
  rootIds: string[];
  idMap: PasteIdMap;
};

type Resolver = (type: RecordKey, id: string) => string | null;

function checkPastable(pastingType: Copiable, focussing: FocusData, project: ProjectInstance) {
  const pastableType = ClipboardOwnMap[pastingType];
  if (!pastableType) return false;
  if (pastableType === true) return true;

  const focussingType =
    focussing.type === "node"
      ? project.getUnsafe("nodes", focussing.target).nodeType
      : focussing.type;
  if (focussingType === pastableType[0]) return pastableType[1];
  return false;
}

export function paste(
  target: FocusData = get(currentFocus),
  pos: Record<"x" | "y", number> = get(viewport.pos),
  preserveExternalOutputs = false
) {
  try {
    if (!clipboard.has(ClipboardFormat)) return;

    const c: CopiedData = unpack(clipboard.readBuffer(ClipboardFormat));
    if (!c || !isRecord(c) || !c.type || !c.data) return;

    processPasteData(c, target, pos, getProject(), preserveExternalOutputs);
  } catch (err) {
    console.error("An error occurred while pasting.", err);
  }
}

function processPasteData(
  data: CopiedData,
  focussing: FocusData,
  position: PastePosition | null = null,
  project: ProjectInstance = getProject(),
  preserveExternalOutputs = false
) {
  const pasteAt = checkPastable(data.type, focussing, project);
  if (!pasteAt) return;

  return getMutator().transaction(() => {
    const pasteResult = pasteInProject(data, position, project, preserveExternalOutputs);
    if (typeof pasteAt === "string") {
      const cf = focussing as Exclude<FocusData, { type: "project" | "nodes" | "node" }>;
      const targetType = SINGULAR_RECORD_MAP[cf.type];
      const binding = getMutator().record(targetType, cf.target).at<string[]>(pasteAt);
      binding.splice(binding.value.length, 0, pasteResult.rootIds[0]);
    }

    if (pasteResult.rootType === "nodes") focusData("nodes", new Set(pasteResult.rootIds));
    else focusData(PROJECT_RECORDS[pasteResult.rootType], pasteResult.rootIds[0]);

    return pasteResult;
  });
}

function pasteInProject(
  data: CopiedData,
  position: PastePosition | null,
  project: ProjectInstance,
  preserveExternalOutputs = false
): PasteResult {
  const rootType = data.type === "nodes" ? "nodes" : SINGULAR_RECORD_MAP[data.type];
  const nodePositionBase = getNodePositionBase(data);
  const idMap: PasteIdMap = new Map();
  const reserved = new Set<PasteIdKey>();
  const records: PasteRecord[] = [];
  const rootIds: string[] = [];

  function addPasteRecord(
    type: RecordKey,
    copiedData: RecordValue,
    oldId: string | undefined,
    root: boolean
  ) {
    const existingId = oldId ? idMap.get(createPasteIdKey(type, oldId)) : undefined;
    if (existingId) {
      if (root) rootIds.push(existingId);
      return;
    }

    const newId = genUniqueRecordId(project, type, reserved);
    if (oldId) idMap.set(createPasteIdKey(type, oldId), newId);
    reserved.add(createPasteIdKey(type, newId));
    records.push({ type, oldId, newId, data: copiedData, root });
    if (root) rootIds.push(newId);
  }

  if (data.type === "nodes") {
    for (const node of data.data) {
      addPasteRecord("nodes", node, getDataId(node), true);
    }
  } else {
    addPasteRecord(rootType, data.data as RecordValue, getDataId(data.data), true);
  }

  forEachExtractRecord(data.owned, (type, oldId, copiedData) => {
    addPasteRecord(type, copiedData, oldId, false);
  });

  for (const record of records) {
    const clonedData = structuredClone(record.data) as RecordValue;
    assignDataId(clonedData, record.newId);
    applyPastedNodePosition(record, clonedData, position, nodePositionBase);
    rewriteRelationIds(record.type, clonedData, (type, id) => {
      return idMap.get(createPasteIdKey(type, id)) ?? (preserveExternalOutputs ? id : null);
    });
    getMutator().add(record.type, record.newId, clonedData as never);
  }

  return {
    rootType,
    rootIds,
    idMap
  };
}

function getNodePositionBase(data: CopiedData) {
  if (data.type === "nodes") return data.data[0]?.nodePos;
  if (data.type === "node") return data.data.nodePos;
  return undefined;
}

function applyPastedNodePosition(
  record: PasteRecord,
  data: RecordValue,
  position: PastePosition | null | undefined,
  base: PastePosition | undefined
) {
  if (!position || !record.root || record.type !== "nodes" || !isNodeRecord(data)) return;

  if (!base) {
    data.nodePos = { ...position };
    return;
  }

  data.nodePos = {
    x: data.nodePos.x - base.x + position.x,
    y: data.nodePos.y - base.y + position.y
  };
}

function isNodeRecord(data: RecordValue): data is RecordValue<"nodes"> {
  return isRecord(data) && "nodePos" in data && isPosition(data.nodePos);
}

function isPosition(value: unknown): value is PastePosition {
  return isRecord(value) && typeof value.x === "number" && typeof value.y === "number";
}

function createPasteIdKey(type: RecordKey, id: string): PasteIdKey {
  return `${type}:${id}`;
}

function genUniqueRecordId(project: ProjectInstance, type: RecordKey, reserved: Set<PasteIdKey>) {
  let id: string;
  do {
    id = genId();
  } while (hasProjectRecordId(project, type, id) || reserved.has(createPasteIdKey(type, id)));
  return id;
}

function hasProjectRecordId(project: ProjectInstance, type: RecordKey, id: string) {
  return (project[type] as Map<string, unknown>).has(id);
}

function getDataId(data: unknown) {
  return isRecord(data) && typeof data.id === "string" ? data.id : undefined;
}

function assignDataId(data: unknown, id: string) {
  if (isRecord(data) && "id" in data) data.id = id;
}

function forEachExtractRecord(
  result: ExtractResult,
  callback: (type: RecordKey, oldId: string, data: RecordValue) => void
) {
  const extracted = result as Record<string, unknown>;
  for (const key in extracted) {
    if (!isRecordKey(key)) continue;

    const value = extracted[key];
    if (!value) continue;

    if (value instanceof Map) {
      for (const [oldId, data] of value) {
        callback(key, oldId, data as RecordValue);
      }
      continue;
    }

    if (isRecord(value)) {
      for (const oldId in value) {
        callback(key, oldId, value[oldId] as RecordValue);
      }
    }
  }
}

function isRecordKey(value: string): value is RecordKey {
  return value in PROJECT_RECORDS;
}

function rewriteRelationIds(type: RecordKey, data: RecordValue, resolve: Resolver) {
  const map = (RelationMap as RelationMapType)[type];
  if (!map) return;
  rewriteRelationMap(data, map, resolve);
}

function rewriteRelationMap(data: unknown, map: RelationTree, resolve: Resolver) {
  if (!isRecord(data)) return;

  if (map.$dependsOn && map.$cases) {
    const caseKey = data[map.$dependsOn];
    if (typeof caseKey === "string") {
      const caseMap = map.$cases[caseKey];
      if (caseMap) rewriteRelationMap(data, caseMap, resolve);
    }
  }

  for (const key in map) {
    if (key === "$dependsOn" || key === "$cases") continue;

    const relation = map[key];
    if (isRelationLeaf(relation)) {
      rewriteRelationLeaf(data, key, relation, resolve);
      continue;
    }

    if (isRelationTree(relation)) {
      rewriteRelationMap(data[key], relation, resolve);
    }
  }
}

function rewriteRelationLeaf(
  data: Record<string, unknown>,
  key: string,
  relation: RelationLeaf,
  resolve: Resolver
) {
  const value = data[key];
  if (relation.$type === TYPE.ID) {
    if (typeof value === "string") data[key] = resolve(relation.$key, value);
    return;
  }

  if (relation.$type === TYPE.ID_ARRAY && Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (typeof value[i] === "string") value[i] = resolve(relation.$key, value[i]);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
