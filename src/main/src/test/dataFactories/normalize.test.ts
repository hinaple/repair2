import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Types } from "@shared/projectData/types";
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
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  await runNormalizeDataFactoryTest();
}
