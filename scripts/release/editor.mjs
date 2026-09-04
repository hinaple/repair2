import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

function commandExists(command, env) {
  const finder = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(finder, [command], { encoding: "utf8", env });
  if (result.error) return false;
  return result.status === 0;
}

export function resolveEditor(env = process.env, hasVsCode) {
  if (env.RELEASE_EDITOR) return { command: env.RELEASE_EDITOR, source: "RELEASE_EDITOR" };

  const codeCommand = process.platform === "win32" ? "code.cmd" : "code";
  if (hasVsCode ?? commandExists(codeCommand, env)) {
    return { command: `${codeCommand} --wait`, source: "VS Code auto-detection" };
  }
  return { command: "notepad.exe", source: "Notepad fallback" };
}

export function openEditor(command, file) {
  const quotedFile = `"${file.replaceAll('"', '""')}"`;
  const result = spawnSync(`${command} ${quotedFile}`, { shell: true, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Editor exited with code ${result.status}.`);
}

function testEditor() {
  const directory = mkdtempSync(join(tmpdir(), "repair2-editor-test-"));
  const file = join(directory, "editor-test.md");
  const editor = resolveEditor();
  writeFileSync(file, "# repair2 editor test\n\nTESTING\n", "utf8");
  console.log(`Selected editor: ${editor.command} (${editor.source})`);
  console.log("Close the test file to finish.");
  try {
    openEditor(editor.command, file);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  console.log("Editor test completed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { test: { type: "boolean" } } });
    if (!values.test) throw new Error("Use --test to open a temporary Markdown file.");
    testEditor();
  } catch (error) {
    console.error(`Editor test error: ${error.message}`);
    process.exitCode = 1;
  }
}
