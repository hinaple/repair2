import test from "node:test";
import assert from "node:assert/strict";
import { validateLockVersions, validateReleaseMarkers, validateVersionIncrease } from "./check.mjs";
import { addReleaseMarkers, genDefaultReleaseNote, parseReleaseMarkers } from "./note.mjs";

const base = "1".repeat(40);
const head = "2".repeat(40);

test("release policy helpers", () => {
  assert.equal(genDefaultReleaseNote(), "");
  validateVersionIncrease("2.6.0-beta.0", "2.5.1", "app");
  assert.throws(() => validateVersionIncrease("2.5.1", "2.5.1", "app"));

  const lock = {
    version: "2.6.0-beta.0",
    packages: { "": { version: "2.6.0-beta.0" }, "packages/plugin-sdk": { version: "0.2.3" } }
  };
  validateLockVersions(lock, "2.6.0-beta.0", "0.2.3", true);
  assert.throws(() => validateLockVersions(lock, "2.6.1", "0.2.3", true));

  const body = addReleaseMarkers("Release notes", base, head);
  assert.deepEqual(parseReleaseMarkers(body), { baseSha: base, headSha: head });
  validateReleaseMarkers(body, base, head);
  assert.throws(() => validateReleaseMarkers(body, head, base));
});
