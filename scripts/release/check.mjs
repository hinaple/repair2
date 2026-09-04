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

export function checkRelease({ base, head, requireTagAbsent = false, requireNpmAbsent = false }) {
  const mainPackage = readJsonAt(base, "package.json");
  const appPackage = readJsonAt(head, "package.json");
  const lock = readJsonAt(head, "package-lock.json");

  validateVersionIncrease(appPackage.version, mainPackage.version, "app");
  const tag = `v${appPackage.version}`;
  if (requireTagAbsent && tagExists(tag)) throw new Error(`Git tag already exists: ${tag}`);

  const sdkChanged = sdkTreeChanged(base, head);
  let sdkVersion = null;
  let sdkName = null;
  if (sdkChanged) {
    const mainSdk = readJsonAt(base, "packages/plugin-sdk/package.json");
    const sdk = readJsonAt(head, "packages/plugin-sdk/package.json");
    if (sdk.name !== "@fainthit/repair2-plugin-sdk") {
      throw new Error(`Unexpected SDK package name: ${sdk.name}`);
    }
    validateVersionIncrease(sdk.version, mainSdk.version, "SDK");
    sdkVersion = sdk.version;
    sdkName = sdk.name;
    if (requireNpmAbsent && readPublishedPackage(sdkName, sdkVersion)) {
      throw new Error(`npm package already exists: ${sdkName}@${sdkVersion}`);
    }
  }

  validateLockVersions(lock, appPackage.version, sdkVersion, sdkChanged);
  const commits = gitText(
    "log",
    "--reverse",
    "--topo-order",
    "--no-merges",
    "--format=%h%x09%s",
    `${base}..${head}`
  )
    .split(/\r?\n/)
    .filter(Boolean);
  if (commits.length === 0) throw new Error("There are no new non-merge commits to release.");

  return {
    appVersion: appPackage.version,
    tag,
    prerelease: semver.prerelease(appPackage.version) !== null,
    commits,
    sdkChanged,
    sdkName,
    sdkVersion
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
