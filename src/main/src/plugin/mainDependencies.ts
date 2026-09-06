import { join, resolve } from "path";
import { hashString } from "../lib/hash";
import fs from "fs/promises";
import { pathExists } from "../system/pathExists";
import { spawnPromise } from "../system/externalTools";
import { logger } from "../logs/logger";

const DEPS_DATA = ".deps.json";
const STAGING_DIR = ".deps-staging";
const BAK_DIR = ".deps-bak";

type DepsData = {
  dependenciesFingerprint?: string;
};

type PackageJson = {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

function depsFingerprint(pkg: PackageJson, pkgLock: string = "{}") {
  return hashString(
    JSON.stringify([
      pkg.dependencies ?? {},
      pkg.optionalDependencies ?? {},
      pkgLock,
      process.versions.electron,
      process.platform,
      process.arch
    ])
  );
}

function silentReadFile(filePath: string): Promise<string | null>;
function silentReadFile<T>(filePath: string, defaultValue: T): Promise<string | T>;
function silentReadFile(filePath: string, defaultValue: any = null) {
  return fs.readFile(join(filePath), "utf8").catch(() => defaultValue);
}

function readJson<T>(filePath: string) {
  return silentReadFile(filePath).then((c) => {
    if (!c) return null;
    try {
      return JSON.parse(c);
    } catch {
      return null;
    }
  }) as Promise<T | null>;
}

function isEmptyRecord(obj: Record<string, any> | undefined | null) {
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) return false;
  }
  return true;
}

function noDependencies(pkg: PackageJson) {
  return isEmptyRecord(pkg.dependencies) && isEmptyRecord(pkg.optionalDependencies);
}

function writeDepsData(targetDir: string, fingerprint: string) {
  return fs.writeFile(
    join(targetDir, DEPS_DATA),
    JSON.stringify({ dependenciesFingerprint: fingerprint } satisfies DepsData)
  );
}

function readFingerprint(targetDir: string) {
  return readJson<DepsData>(join(targetDir, DEPS_DATA)).then((d) => d?.dependenciesFingerprint);
}

function makeSanitizedPkg(srcPkg: PackageJson) {
  if (!("scripts" in srcPkg)) return srcPkg;
  const newPkg = { ...srcPkg };
  delete newPkg.scripts;
  return newPkg;
}

function writeSanitizedPkg(srcPkg: PackageJson, dir: string) {
  return fs.writeFile(join(dir, "package.json"), JSON.stringify(makeSanitizedPkg(srcPkg)));
}

function rmDir(dir: string) {
  return fs.rm(dir, { recursive: true, force: true });
}

async function restoreTargetDir(targetDir: string, didBackup: boolean, bakDir: string) {
  const targetNodeModules = join(targetDir, "node_modules");
  if (didBackup) await fs.rename(bakDir, targetNodeModules);
  else await rmDir(targetNodeModules);
}

async function safeApplyNodeModules(
  stagingDir: string,
  targetDir: string,
  targetModulesExists: boolean
): Promise<{ error: any; bakDir: string }> {
  const targetNodeModules = join(targetDir, "node_modules");
  const bakDir = join(targetDir, BAK_DIR);

  await rmDir(bakDir);

  if (targetModulesExists) await fs.rename(targetNodeModules, bakDir);

  const moveError = await fs
    .rename(join(stagingDir, "node_modules"), targetNodeModules)
    .catch((err) => err);

  if (!moveError) {
    return { error: null, bakDir };
  }

  return { error: moveError, bakDir };
}

export async function updateMainDependencies({
  getNpmExists,
  withPluginsStopped,
  sourceDir,
  targetDir,
  forceUpdate = false
}: {
  getNpmExists: () => boolean;
  withPluginsStopped: <T>(work: () => Promise<T>) => Promise<T>;
  sourceDir: string;
  targetDir: string;
  forceUpdate?: boolean;
}): Promise<{ error?: any; message?: string }> {
  if (resolve(sourceDir) === resolve(targetDir)) {
    return { error: "Plugin source directory must be different from target directory" };
  }

  const srcPkgPath = join(sourceDir, "package.json");
  const srcPkgLockPath = join(sourceDir, "package-lock.json");
  const [srcPkg, srcLock] = await Promise.all([
    readJson<PackageJson>(srcPkgPath),
    silentReadFile(srcPkgLockPath).then((l) => (l ? l : ""))
  ]);
  if (!srcPkg) return { error: `Cannot read ${srcPkgPath}` };

  const oldFingerprint = forceUpdate ? "" : await readFingerprint(targetDir);
  if (noDependencies(srcPkg)) {
    const newFingerprint = depsFingerprint(srcPkg);

    if (!forceUpdate && oldFingerprint === newFingerprint) return {}; // No dependencies, no target modules

    return withPluginsStopped(async () => {
      logger.debug("Removing unsused dependencies...");
      const targetNodeModules = join(targetDir, "node_modules");
      const rmError = await rmDir(targetNodeModules).catch((err) => err);
      if (rmError) {
        return { error: rmError, message: `Failed to remove ${targetNodeModules}` };
      }

      await Promise.all([
        fs.copyFile(srcPkgPath, join(targetDir, "package.json")),
        srcLock
          ? fs.copyFile(srcPkgLockPath, join(targetDir, "package-lock.json"))
          : fs.rm(join(targetDir, "package-lock.json"), { force: true })
      ]);

      await writeDepsData(targetDir, newFingerprint);
      return {};
    });
  }

  const newFingerprint = depsFingerprint(srcPkg, srcLock);
  const targetModulesExists = await pathExists(join(targetDir, "node_modules"));
  if (!forceUpdate && oldFingerprint === newFingerprint && targetModulesExists) return {}; // Already updated

  if (!getNpmExists()) return { error: "Cannot find NPM" };

  logger.debug("Creating temporal dependencies directory...");
  const stagingDir = join(targetDir, STAGING_DIR);
  await rmDir(stagingDir);
  await fs.mkdir(stagingDir, { recursive: true });

  try {
    const stagingLockPath = join(stagingDir, "package-lock.json");
    await Promise.all([
      writeSanitizedPkg(srcPkg, stagingDir),
      srcLock ? fs.writeFile(stagingLockPath, srcLock) : null
    ]);

    logger.debug("Installing dependencies...");
    const npmResult = await spawnPromise(
      srcLock
        ? ["npm", "ci", "--omit=dev"]
        : ["npm", "install", "--omit=dev", "--package-lock=true"],
      {
        cwd: stagingDir
      }
    );
    if (npmResult.error) {
      return { error: npmResult, message: "NPM install error" };
    }
    console.log(npmResult.message);

    logger.debug("Rebuilding dependencies...");
    const rebuild = (await import("@electron/rebuild")).rebuild;
    const rebuildErr = await rebuild({
      buildPath: stagingDir,
      electronVersion: process.versions.electron
    }).catch((err) => err);

    if (rebuildErr) {
      return { error: rebuildErr, message: "Electron rebuild error" };
    }

    return await withPluginsStopped(async () => {
      logger.debug("Moving staged dependencies files...");
      const moveResult = await safeApplyNodeModules(stagingDir, targetDir, targetModulesExists);
      if (moveResult.error) {
        await restoreTargetDir(targetDir, targetModulesExists, moveResult.bakDir);
        return { error: moveResult.error, message: "Failed to move node_modules" };
      }

      const copyError = await fs
        .copyFile(srcPkgPath, join(targetDir, "package.json"))
        .then(() =>
          fs.copyFile(
            srcLock ? srcPkgLockPath : stagingLockPath,
            join(targetDir, "package-lock.json")
          )
        )
        .catch((err) => err);
      if (copyError) {
        await rmDir(join(targetDir, "node_modules"));
        await restoreTargetDir(targetDir, targetModulesExists, moveResult.bakDir);
        return { error: copyError, message: "Package files copy error" };
      }

      if (targetModulesExists) await rmDir(moveResult.bakDir);
      await writeDepsData(targetDir, newFingerprint);

      logger.debug("Dependencies updated.");
      return {};
    });
  } finally {
    await rmDir(stagingDir);
  }
}
