import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import semver from "semver";
import { checkRelease, readPublishedPackage, run } from "./check.mjs";
import { parseReleaseMarkers } from "./note.mjs";

const git = (...args) => run("git", args).stdout.trim();

function requireEnvironment() {
  if (process.env.GITHUB_ACTIONS !== "true")
    throw new Error("Deployment may only run in GitHub Actions.");
  for (const name of ["MERGE_SHA", "RELEASE_PR_BODY", "RUNNER_TEMP", "GITHUB_REPOSITORY"]) {
    if (!process.env[name]) throw new Error(`${name} is required.`);
  }
}

function verifyMerge(mergeSha, body) {
  const [commit, base, head, ...extra] = git("rev-list", "--parents", "-n", "1", mergeSha).split(
    " "
  );
  if (commit !== mergeSha || !base || !head || extra.length) {
    throw new Error("Release SHA must be a two-parent merge commit.");
  }
  const markers = parseReleaseMarkers(body);
  if (markers.baseSha !== base || markers.headSha !== head) {
    throw new Error("Merge parents do not match the release PR SHA markers.");
  }
  return { base, head };
}

function publishSdk(release, mergeSha) {
  if (!release.sdkChanged) return;
  if (!semver.satisfies(process.version, ">=22.14.0")) {
    throw new Error("npm Trusted Publishing requires Node 22.14.0 or newer.");
  }
  const npmVersion = run("npm", ["--version"]).stdout.trim();
  if (!semver.satisfies(npmVersion, ">=11.5.1")) {
    throw new Error("npm Trusted Publishing requires npm 11.5.1 or newer.");
  }

  const published = readPublishedPackage(release.sdkName, release.sdkVersion);
  if (published) {
    if (published.gitHead?.toLowerCase() !== mergeSha) {
      throw new Error(
        `${release.sdkName}@${release.sdkVersion} already exists with a different or missing gitHead.`
      );
    }
    console.log(`SDK already published from ${mergeSha}; skipping npm publish.`);
    return;
  }

  run("npm", ["publish"], { cwd: resolve("packages/plugin-sdk"), stdio: "inherit" });
}

function readRemoteTag(tag) {
  const lines = run("git", [
    "ls-remote",
    "--tags",
    "origin",
    `refs/tags/${tag}`,
    `refs/tags/${tag}^{}`
  ])
    .stdout.trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const peeled = lines.find((line) => line.endsWith(`refs/tags/${tag}^{}`));
  return (peeled ?? lines[0])?.split(/\s+/)[0] ?? null;
}

function ensureTag(tag, mergeSha) {
  const current = readRemoteTag(tag);
  if (current) {
    if (current !== mergeSha) throw new Error(`${tag} points to a different commit.`);
    return;
  }

  run("git", ["tag", tag, mergeSha]);
  const pushed = run("git", ["push", "origin", `refs/tags/${tag}`], {
    allowFailure: true,
    stdio: "inherit"
  });
  if (pushed.status === 0) return;

  if (readRemoteTag(tag) !== mergeSha) {
    throw new Error(`${tag} was created concurrently for a different commit.`);
  }
}

function readRelease(tag) {
  const result = run(
    "gh",
    ["release", "view", tag, "--json", "tagName,isDraft,isPrerelease,assets"],
    {
      allowFailure: true
    }
  );
  if (result.status === 0) return JSON.parse(result.stdout);
  const detail = `${result.stdout}\n${result.stderr}`;
  if (/release not found|HTTP 404/i.test(detail)) return null;
  throw new Error(`Could not inspect GitHub Release ${tag}: ${detail.trim()}`);
}

function ensureRelease(release, notesFile, artifact) {
  let current = readRelease(release.tag);
  if (!current) {
    const args = [
      "release",
      "create",
      release.tag,
      artifact,
      "--draft",
      "--verify-tag",
      "--title",
      `Release v${release.appVersion}`,
      "--notes-file",
      notesFile
    ];
    if (release.prerelease) args.push("--prerelease");
    run("gh", args, { stdio: "inherit" });
    current = readRelease(release.tag);
  }

  if (current.tagName !== release.tag)
    throw new Error("Existing GitHub Release uses an unexpected tag.");
  if (!current.isDraft && current.isPrerelease !== release.prerelease) {
    throw new Error("Existing GitHub Release prerelease state does not match the app version.");
  }
  const artifactName = artifact.split(/[\\/]/).at(-1);
  if (!current.assets.some((asset) => asset.name === artifactName)) {
    run("gh", ["release", "upload", release.tag, artifact], { stdio: "inherit" });
  }
  if (current.isDraft) {
    const args = [
      "release",
      "edit",
      release.tag,
      "--draft=false",
      "--title",
      `Release v${release.appVersion}`,
      "--notes-file",
      notesFile
    ];
    if (release.prerelease) args.push("--prerelease");
    run("gh", args, { stdio: "inherit" });
  }
}

try {
  requireEnvironment();
  const mergeSha = process.env.MERGE_SHA.toLowerCase();
  const body = process.env.RELEASE_PR_BODY;
  const { base } = verifyMerge(mergeSha, body);
  const release = checkRelease({ base, head: mergeSha });
  const artifact = resolve("dist", `repair2-${release.appVersion}-setup.exe`);
  if (!existsSync(artifact)) throw new Error(`Windows installer not found: ${artifact}`);

  publishSdk(release, mergeSha);
  const notesFile = join(process.env.RUNNER_TEMP, "release-notes.md");
  if (!body.trim()) throw new Error("Release PR body is empty.");
  writeFileSync(notesFile, body, "utf8");
  ensureTag(release.tag, mergeSha);
  ensureRelease(release, notesFile, artifact);
  console.log(`Release completed: ${release.tag}`);
} catch (error) {
  console.error(`Release deployment error: ${error.message}`);
  process.exitCode = 1;
}
