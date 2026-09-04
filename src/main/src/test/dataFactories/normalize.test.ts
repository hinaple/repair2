import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Types } from "@shared/projectData/types";
import { PROJECT_RECORDS, type RecordKey } from "@shared/constants";
import { forEachRelationId } from "@shared/projectData/relation";
import normalizeData from "./normalizeData.json";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    throw error;
  }
}

const projectData = normalizeData as Types.Data;

export async function runNormalizeDataFactoryTest() {
  (globalThis as any).__APP_VERSION__ = "normalize-data-factory-test";

  const { createProject } = await import("@shared/projectData/factories");

  runCase("createProject preserves a complex valid project during normalization", () => {
    const beforeNormalize = structuredClone(projectData);
    const normalized = createProject(projectData);

    assert.deepEqual(normalized, projectData);
    assert.deepEqual(projectData, beforeNormalize);
  });

  runCase("every normalized relation points to an existing record", () => {
    forEachRelationId("config", projectData.config, ({ type, id }) => {
      assert.ok(projectData[type][id], `config references missing ${type}:${id}`);
    });
    for (const type of Object.keys(PROJECT_RECORDS) as RecordKey[]) {
      const records = projectData[type] as Record<string, unknown>;
      for (const [sourceId, data] of Object.entries(records)) {
        forEachRelationId(type, data as never, ({ type: targetType, id }) => {
          assert.ok(
            projectData[targetType][id],
            `${type}:${sourceId} references missing ${targetType}:${id}`
          );
        });
      }
    }
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  await runNormalizeDataFactoryTest();
}
