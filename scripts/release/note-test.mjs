import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReleaseNoteContext, run } from "./check.mjs";
import { openEditor, resolveEditor } from "./editor.mjs";
import { genDefaultReleaseNote } from "./note.mjs";

const git = (...args) => run("git", args).stdout.trim();
const directory = mkdtempSync(join(tmpdir(), "repair2-release-note-test-"));
const file = join(directory, "release-note.md");

try {
  const context = createReleaseNoteContext({
    base: git("rev-parse", "origin/main"),
    head: git("rev-parse", "HEAD")
  });
  const editor = resolveEditor();

  writeFileSync(file, genDefaultReleaseNote(context), "utf8");
  console.log(`Opening release note with ${editor.command} (${editor.source}).`);
  openEditor(editor.command, file);
} catch (error) {
  console.error(`Release note test error: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
