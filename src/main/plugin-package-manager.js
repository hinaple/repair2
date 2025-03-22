import { join } from "path";
import { exec } from "child_process";
import fs from "fs/promises";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import semver from "semver";

class PluginPackageManager {
    constructor(pluginDir, packagesDir) {
        this.pluginDir = pluginDir;
        this.packagesDir = packagesDir;
        this.nodeModulesDir = join(this.packagesDir, "node_modules");
        this.require = createRequire(import.meta.url);
    }

    async initialize() {
        try {
            await fs.mkdir(this.packagesDir, { recursive: true });
            const packageJsonPath = join(this.packagesDir, "package.json");

            try {
                await fs.access(packageJsonPath);
            } catch {
                await fs.writeFile(
                    packageJsonPath,
                    JSON.stringify(
                        {
                            name: "plugin-packages",
                            private: true,
                            dependencies: {}
                        },
                        null,
                        2
                    )
                );
            }

            const dependenciesPath = join(this.pluginDir, "dependencies.json");
            await fs
                .readFile(dependenciesPath, "utf-8")
                .then((data) => {
                    try {
                        const dependencies = JSON.parse(data);
                        return Promise.all(
                            Object.entries(dependencies).map(([name, version]) => {
                                this.installPackage(name, version, this.nodeModulesDir);
                            })
                        );
                    } catch {}
                })
                .catch(() => {
                    console.log("There is no dependencies.json");
                });
        } catch (error) {
            console.error("Failed to initialize plugin system:", error);
            throw error;
        }
    }

    async getPackageInfo(packagePath) {
        const pkgJsonPath = join(packagePath, "package.json");
        const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf-8"));

        // 진입점 찾기
        let entryPoint = pkgJson.module || pkgJson.main || "index.js";
        if (entryPoint.startsWith("./")) {
            entryPoint = entryPoint.slice(2);
        }

        const fullEntryPath = join(packagePath, entryPoint);
        const fileUrl = pathToFileURL(fullEntryPath).href;

        return {
            path: fullEntryPath,
            url: fileUrl,
            version: pkgJson.version,
            isESM:
                pkgJson.type === "module" ||
                pkgJson.module ||
                (pkgJson.exports && typeof pkgJson.exports === "object")
        };
    }

    async checkExistingPackage(packagePath, version) {
        try {
            await fs.access(packagePath);
            const packageInfo = await this.getPackageInfo(packagePath);

            if (
                version === "latest" ||
                (packageInfo.version && semver.satisfies(packageInfo.version, version))
            ) {
                return packageInfo;
            }
        } catch {}
        return null;
    }

    async npmInstall(name, version, cwd) {
        return new Promise((resolve, reject) => {
            const command = `npm install ${name}@${version} --prefix "${cwd}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Failed to install package ${name}:`, error);
                    reject(error);
                    return;
                }

                if (stderr) {
                    console.warn(`Warning during package installation:`, stderr);
                }

                console.log(`Successfully installed package ${name}:`, stdout);
                resolve();
            });
        });
    }

    async installPackage(name, version = "latest") {
        console.log(`Installing ${name}@${version} for plugin`);
        const packagePath = join(this.nodeModulesDir, name);

        const existingPackage = await this.checkExistingPackage(packagePath, version);
        if (existingPackage) {
            console.log("Already installed");
            return existingPackage;
        }

        await this.npmInstall(name, version, this.packagesDir);
        console.log("Successfully installed");
        return await this.getPackageInfo(packagePath);
    }

    async requirePackage(name) {
        try {
            const packagePath = join(this.nodeModulesDir, name);
            await fs.access(packagePath);

            const pkgJsonPath = join(packagePath, "package.json");
            const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf-8"));

            let entryPoint = pkgJson.module || pkgJson.main || "index.js";
            if (entryPoint.startsWith("./")) {
                entryPoint = entryPoint.slice(2);
            }
            const fullEntryPath = join(packagePath, entryPoint);

            const isESM =
                pkgJson.type === "module" ||
                pkgJson.module ||
                (pkgJson.exports && typeof pkgJson.exports === "object");

            if (isESM) {
                const moduleUrl = pathToFileURL(fullEntryPath).href;
                return await import(moduleUrl);
            } else {
                return this.require(fullEntryPath);
            }
        } catch (error) {
            console.error(`Failed to require package ${name}:`, error);
            throw error;
        }
    }
}

export default PluginPackageManager;
