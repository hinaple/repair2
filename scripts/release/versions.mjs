import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { readPublishedPackage, run, tagExists, validateVersionIncrease } from "./check.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");

async function askVersion(reader, label, current, validate) {
  while (true) {
    const version = (await reader.question(`${label} version [${current}]: `)).trim() || current;
    try {
      validate(version);
      return version;
    } catch (error) {
      console.error(error.message);
    }
  }
}

export async function prepareReleaseVersions(context) {
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  let appVersion;
  let sdkVersion = context.sdk.version;
  try {
    appVersion = await askVersion(reader, "App", context.app.version, (version) => {
      validateVersionIncrease(version, context.app.previousVersion, "app");
      if (tagExists(`v${version}`)) throw new Error(`Git tag already exists: v${version}`);
    });

    if (context.sdk.changed) {
      sdkVersion = await askVersion(reader, "SDK", sdkVersion, (version) => {
        validateVersionIncrease(version, context.sdk.previousVersion, "SDK");
        if (readPublishedPackage(context.sdk.name, version)) {
          throw new Error(`npm package already exists: ${context.sdk.name}@${version}`);
        }
      });
    }
  } finally {
    reader.close();
  }

  const rootFile = "package.json";
  const lockFile = "package-lock.json";
  const sdkFile = "packages/plugin-sdk/package.json";
  const root = readJson(rootFile);
  const lock = readJson(lockFile);
  const sdk = readJson(sdkFile);
  const changedFiles = [];

  if (root.version !== appVersion) {
    root.version = appVersion;
    lock.version = appVersion;
    lock.packages[""].version = appVersion;
    writeJson(rootFile, root);
    changedFiles.push(rootFile);
  }

  if (context.sdk.changed && sdk.version !== sdkVersion) {
    sdk.version = sdkVersion;
    lock.packages["packages/plugin-sdk"].version = sdkVersion;
    writeJson(sdkFile, sdk);
    changedFiles.push(sdkFile);
  }

  if (changedFiles.length === 0) return;

  writeJson(lockFile, lock);
  changedFiles.push(lockFile);
  run("git", ["add", "--", ...changedFiles]);
  run(
    "git",
    [
      "commit",
      "-m",
      `chore: release v${appVersion}${context.sdk.changed ? ` / SDK v${sdkVersion}` : ""}`,
      "-m",
      "#nn"
    ],
    { stdio: "inherit" }
  );
}
