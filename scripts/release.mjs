import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { checkRelease, run } from "./release/check.mjs";
import { addReleaseMarkers, genDefaultReleaseNote } from "./release/note.mjs";

const git = (...args) => run("git", args).stdout.trim();

function requireCleanDevelop() {
  if (git("branch", "--show-current") !== "develop")
    throw new Error("Current branch must be develop.");
  if (git("status", "--porcelain")) throw new Error("Working tree must be clean.");
}

function fetchReleaseRefs() {
  run("git", ["fetch", "--prune", "origin", "--tags"]);
}

function findOpenReleasePr() {
  const prs = JSON.parse(
    run("gh", [
      "pr",
      "list",
      "--state",
      "open",
      "--base",
      "main",
      "--head",
      "develop",
      "--limit",
      "100",
      "--json",
      "number,url,headRefName,isCrossRepository"
    ]).stdout
  );
  return prs.find((pr) => pr.headRefName === "develop" && !pr.isCrossRepository);
}

function runEditor(editor, file) {
  const quotedFile = `"${file.replaceAll('"', '""')}"`;
  const result = spawnSync(`${editor} ${quotedFile}`, { shell: true, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Editor exited with code ${result.status}.`);
}

function commandExists(command) {
  const finder = process.platform === "win32" ? "where.exe" : "which";
  return run(finder, [command], { allowFailure: true }).status === 0;
}

function printRelease(release) {
  console.log(`\nRelease v${release.appVersion}\n`);
  console.log("Changes:");
  for (const commit of release.commits) console.log(commit);
  console.log(`\nSDK changed: ${release.sdkChanged ? "yes" : "no"}`);
  if (release.sdkChanged) console.log(`SDK version: ${release.sdkVersion}`);
}

let noteDirectory;
let createdPrUrl;

try {
  const { values } = parseArgs({ options: { "dry-run": { type: "boolean" } } });
  const dryRun = values["dry-run"] ?? false;

  requireCleanDevelop();
  run("gh", ["--version"]);
  run("gh", ["auth", "status"]);
  fetchReleaseRefs();

  const openPr = findOpenReleasePr();
  if (openPr) throw new Error(`A develop -> main release PR is already open: ${openPr.url}`);

  const [localOnly, remoteOnly] = git(
    "rev-list",
    "--left-right",
    "--count",
    "HEAD...origin/develop"
  )
    .split(/\s+/)
    .map(Number);
  if (remoteOnly > 0) {
    throw new Error(
      localOnly > 0
        ? "Local and origin/develop have diverged."
        : "Local develop is behind origin/develop."
    );
  }

  const baseSha = git("rev-parse", "origin/main");
  const headSha = git("rev-parse", "HEAD");
  const release = checkRelease({
    base: baseSha,
    head: headSha,
    requireTagAbsent: true,
    requireNpmAbsent: true
  });

  printRelease(release);
  if (dryRun) {
    if (localOnly > 0)
      console.log(`Local develop is ${localOnly} commit(s) ahead of origin/develop.`);
    console.log("\nDry run completed. Nothing was pushed and no PR was created.");
  } else {
    if (localOnly > 0) run("git", ["push", "origin", "HEAD:develop"], { stdio: "inherit" });
    if (git("rev-parse", "origin/develop") !== headSha) {
      fetchReleaseRefs();
      if (git("rev-parse", "origin/develop") !== headSha)
        throw new Error("origin/develop does not match HEAD.");
    }

    noteDirectory = mkdtempSync(join(tmpdir(), "repair2-release-"));
    const noteFile = join(noteDirectory, "release-note.md");
    writeFileSync(noteFile, genDefaultReleaseNote(), "utf8");
    const editor =
      process.env.RELEASE_EDITOR ||
      process.env.VISUAL ||
      process.env.EDITOR ||
      (commandExists("code") ? "code --wait" : "notepad.exe");
    runEditor(editor, noteFile);

    const note = readFileSync(noteFile, "utf8").trim();
    if (!note) throw new Error("Release cancelled because the release note is empty.");

    fetchReleaseRefs();
    requireCleanDevelop();
    if (git("rev-parse", "origin/main") !== baseSha)
      throw new Error("origin/main changed while editing the release note.");
    if (git("rev-parse", "origin/develop") !== headSha) {
      throw new Error("origin/develop changed while editing the release note.");
    }
    const concurrentPr = findOpenReleasePr();
    if (concurrentPr)
      throw new Error(`A develop -> main release PR is already open: ${concurrentPr.url}`);

    writeFileSync(noteFile, addReleaseMarkers(note, baseSha, headSha), "utf8");
    const createOutput = run("gh", [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      "develop",
      "--title",
      `release: v${release.appVersion}`,
      "--body-file",
      noteFile
    ]).stdout;
    createdPrUrl = createOutput.match(/https:\/\/github\.com\/\S+\/pull\/\d+/)?.[0];
    if (!createdPrUrl)
      throw new Error(`PR was created but its URL could not be read: ${createOutput.trim()}`);

    run("gh", ["pr", "merge", createdPrUrl, "--auto", "--merge", "--match-head-commit", headSha], {
      stdio: "inherit"
    });
    rmSync(noteDirectory, { recursive: true, force: true });
    console.log(`\nRelease PR created and auto-merge enabled: ${createdPrUrl}`);
  }
} catch (error) {
  console.error(`Release error: ${error.message}`);
  if (createdPrUrl) console.error(`PR already created: ${createdPrUrl}`);
  if (noteDirectory)
    console.error(`Release note preserved at: ${join(noteDirectory, "release-note.md")}`);
  process.exitCode = 1;
}
