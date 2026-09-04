import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import semver from "semver";
import { parseReleaseMarkers } from "./note.mjs";

export function run(name, args, options = {}) {
  let command = name;
  let commandArgs = args;
  if (process.platform === "win32" && name === "npm") {
    if (args.some((arg) => !/^[a-z0-9@./:_=-]+$/i.test(arg))) {
      throw new Error("Unsafe npm argument.");
    }
    command = process.env.ComSpec || "cmd.exe";
    commandArgs = ["/d", "/s", "/c", ["npm", ...args].join(" ")];
  }
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.stdio ?? "pipe"
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`${name} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
  return result;
}

const gitText = (...args) => run("git", args).stdout.trim();
const readJsonAt = (ref, file) => JSON.parse(gitText("show", `${ref}:${file}`));

function parseCommitLog(output) {
  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, shortSha, subject, body, authorName, authoredAt] = record.split("\x1f");
      return { sha, shortSha, subject, body: body.trim(), authorName, authoredAt };
    });
}

function parseChangedFiles(output) {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [status, firstPath, secondPath] = line.split("\t");
      return secondPath
        ? { status, path: secondPath, previousPath: firstPath }
        : { status, path: firstPath };
    });
}

function readCommits(base, head, path) {
  const commits = parseCommitLog(
    gitText(
      "log",
      "--reverse",
      "--topo-order",
      ...(path ? ["--full-history"] : []),
      "--no-merges",
      "--format=%H%x1f%h%x1f%s%x1f%b%x1f%an%x1f%aI%x1e",
      `${base}..${head}`,
      ...(path ? ["--", path] : [])
    )
  );
  return commits.map((commit) => ({
    ...commit,
    changedFiles: parseChangedFiles(
      gitText("diff-tree", "--root", "--no-commit-id", "--name-status", "-r", "-M", commit.sha)
    )
  }));
}

function readChanges(base, head) {
  const changedFiles = parseChangedFiles(gitText("diff", "--name-status", "-M", base, head, "--"));
  return gitText("diff", "--numstat", base, head, "--")
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce(
      (changes, line) => {
        const [insertions, deletions] = line.split("\t");
        if (insertions === "-" || deletions === "-") changes.binaryFiles += 1;
        else {
          changes.insertions += Number(insertions);
          changes.deletions += Number(deletions);
        }
        return changes;
      },
      { changedFiles, files: changedFiles.length, insertions: 0, deletions: 0, binaryFiles: 0 }
    );
}

function repositoryWebUrl(remoteUrl) {
  const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/i);
  return match ? `https://github.com/${match[1].replace(/\.git$/i, "")}` : null;
}

export function validateVersionIncrease(current, previous, label) {
  if (!semver.valid(previous))
    throw new Error(`main ${label} version is not valid SemVer: ${previous}`);
  if (!semver.valid(current))
    throw new Error(`develop ${label} version is not valid SemVer: ${current}`);
  if (!semver.gt(current, previous)) {
    throw new Error(`${label} version must be greater than main (${current} <= ${previous}).`);
  }
}

export function validateLockVersions(lock, appVersion, sdkVersion, sdkChanged) {
  if (lock.version !== appVersion || lock.packages?.[""]?.version !== appVersion) {
    throw new Error(`package-lock.json root version must match package.json (${appVersion}).`);
  }
  if (sdkChanged && lock.packages?.["packages/plugin-sdk"]?.version !== sdkVersion) {
    throw new Error(
      `package-lock.json SDK version must match packages/plugin-sdk/package.json (${sdkVersion}).`
    );
  }
}

export function tagExists(tag) {
  return (
    run("git", ["show-ref", "--verify", "--quiet", `refs/tags/${tag}`], { allowFailure: true })
      .status === 0
  );
}

export function readPublishedPackage(name, version) {
  const result = run("npm", ["view", `${name}@${version}`, "version", "gitHead", "--json"], {
    allowFailure: true
  });
  if (result.status !== 0) {
    const detail = `${result.stdout}\n${result.stderr}`;
    if (/E404|404 Not Found/i.test(detail)) return null;
    throw new Error(`Could not query npm for ${name}@${version}: ${detail.trim()}`);
  }

  const value = JSON.parse(result.stdout || "null");
  return typeof value === "string" ? { version: value } : value;
}

function sdkTreeChanged(base, head) {
  const result = run("git", ["diff", "--quiet", base, head, "--", "packages/plugin-sdk"], {
    allowFailure: true
  });
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  throw new Error((result.stderr || "git diff failed").trim());
}

export function validateReleaseMarkers(body, base, head) {
  const markers = parseReleaseMarkers(body);
  if (markers.baseSha !== base.toLowerCase() || markers.headSha !== head.toLowerCase()) {
    throw new Error("Release PR body SHA markers do not match the current PR base/head.");
  }
}

export function formatSdkVersionError(message, commits) {
  const list = commits.length
    ? commits.map((commit) => `  ${commit}`).join("\n")
    : "  (none found)";
  return `${message}\n\nSDK-changing commits:\n${list}`;
}

export function createReleaseNoteContext({ base, head }) {
  const mainPackage = readJsonAt(base, "package.json");
  const appPackage = readJsonAt(head, "package.json");
  const tag = `v${appPackage.version}`;
  const commits = readCommits(base, head);
  const changes = readChanges(base, head);
  const remoteUrl = gitText("remote", "get-url", "origin");
  const repositoryUrl = repositoryWebUrl(remoteUrl);
  const sdkChanged = sdkTreeChanged(base, head);
  const mainSdk = readJsonAt(base, "packages/plugin-sdk/package.json");
  const sdk = readJsonAt(head, "packages/plugin-sdk/package.json");
  const sdkCommits = sdkChanged ? readCommits(base, head, "packages/plugin-sdk") : [];
  /** @type {Parameters<typeof import("./note.mjs").genDefaultReleaseNote>[0]} */
  const releaseNoteContext = {
    app: {
      previousVersion: mainPackage.version,
      version: appPackage.version,
      tag,
      prerelease: semver.prerelease(appPackage.version) !== null
    },
    git: {
      baseBranch: "main",
      headBranch: "develop",
      baseSha: base,
      headSha: head,
      remoteUrl,
      repositoryUrl,
      compareUrl: repositoryUrl ? `${repositoryUrl}/compare/${base}...${head}` : null
    },
    commits,
    sdk: {
      changed: sdkChanged,
      name: sdk.name,
      previousVersion: mainSdk.version,
      version: sdk.version,
      commits: sdkCommits,
      changedFiles: changes.changedFiles.filter(
        ({ path, previousPath }) =>
          path.startsWith("packages/plugin-sdk/") ||
          previousPath?.startsWith("packages/plugin-sdk/")
      )
    },
    changes
  };

  return releaseNoteContext;
}

export function checkRelease({ base, head, requireTagAbsent = false, requireNpmAbsent = false }) {
  const releaseNoteContext = createReleaseNoteContext({ base, head });
  const { app, commits, sdk } = releaseNoteContext;
  const lock = readJsonAt(head, "package-lock.json");

  validateVersionIncrease(app.version, app.previousVersion, "app");
  if (requireTagAbsent && tagExists(app.tag)) {
    throw new Error(`Git tag already exists: ${app.tag}`);
  }
  if (commits.length === 0) throw new Error("There are no new non-merge commits to release.");

  if (sdk.changed) {
    if (sdk.name !== "@fainthit/repair2-plugin-sdk") {
      throw new Error(`Unexpected SDK package name: ${sdk.name}`);
    }
    try {
      validateVersionIncrease(sdk.version, sdk.previousVersion, "SDK");
    } catch (error) {
      throw new Error(
        formatSdkVersionError(
          error.message,
          sdk.commits.map((commit) => `${commit.shortSha}\t${commit.subject}`)
        )
      );
    }
    if (requireNpmAbsent && readPublishedPackage(sdk.name, sdk.version)) {
      throw new Error(`npm package already exists: ${sdk.name}@${sdk.version}`);
    }
  }

  validateLockVersions(lock, app.version, sdk.version, sdk.changed);

  return {
    appVersion: app.version,
    tag: app.tag,
    prerelease: app.prerelease,
    commits,
    sdkChanged: sdk.changed,
    sdkName: sdk.changed ? sdk.name : null,
    sdkVersion: sdk.changed ? sdk.version : null,
    releaseNoteContext
  };
}

function main() {
  const { values } = parseArgs({
    options: {
      base: { type: "string" },
      head: { type: "string" },
      "registry-absent": { type: "boolean" },
      "verify-markers": { type: "boolean" }
    }
  });
  if (!values.base || !values.head) throw new Error("--base and --head are required.");
  if (values["verify-markers"]) {
    validateReleaseMarkers(process.env.RELEASE_PR_BODY, values.base, values.head);
  }
  const release = checkRelease({
    base: values.base,
    head: values.head,
    requireTagAbsent: true,
    requireNpmAbsent: values["registry-absent"]
  });
  console.log(`Release v${release.appVersion}`);
  console.log(`SDK changed: ${release.sdkChanged ? "yes" : "no"}`);
  if (release.sdkChanged) console.log(`SDK version: ${release.sdkVersion}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`Release check error: ${error.message}`);
    process.exitCode = 1;
  }
}
