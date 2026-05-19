import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const PACKAGE_JSON_TEMPLATE = {
    version: "1.0.0",
    type: "module",
    devDependencies: {}
};

async function copyFolder(from, to) {
    try {
        await fs.mkdir(to, { recursive: true });
        const items = await fs.readdir(from, { withFileTypes: true });

        for (const item of items) {
            const fromPath = path.join(from, item.name);
            const toPath = path.join(to, item.name);

            if (item.isDirectory()) {
                await copyFolder(fromPath, toPath);
            } else if (item.isFile()) {
                await fs.copyFile(fromPath, toPath);
            }
        }
    } catch (err) {
        console.error("an error occurred during copyFolder:", err);
        throw err;
    }
}

// async function replacePluginName(dir, oldName, newName) {
//     const items = await fs.readdir(dir, { withFileTypes: true });

//     for (const item of items) {
//         const itemPath = path.join(dir, item.name);
//         if (item.isDirectory()) {
//             await replacePluginName(itemPath, oldName, newName);
//         } else if (item.isFile()) {
//             let content = await fs.readFile(itemPath, "utf8");
//             content = content.replace(new RegExp(oldName, "g"), newName);
//             await fs.writeFile(itemPath, content, "utf8");
//         }
//     }
// }

function toFileDependencyPath(fromDir, targetDir) {
    const relativePath = path.relative(fromDir, targetDir).replaceAll(path.sep, "/");
    if (!relativePath) return ".";
    if (path.isAbsolute(relativePath) || /^[a-zA-Z]:\//.test(relativePath)) return relativePath;
    if (relativePath.startsWith(".")) return relativePath;
    return `./${relativePath}`;
}

async function makePackageJson(pluginPath, pluginName, sdkPackageDir) {
    const newPackageJson = { ...PACKAGE_JSON_TEMPLATE };
    newPackageJson.devDependencies = { ...PACKAGE_JSON_TEMPLATE.devDependencies };
    newPackageJson.name = pluginName;
    if (sdkPackageDir) {
        newPackageJson.devDependencies["@fainthit/repair2-plugin-sdk"] =
            `file:${toFileDependencyPath(pluginPath, sdkPackageDir)}`;
    }
    await fs.writeFile(
        path.join(pluginPath, "package.json"),
        JSON.stringify(newPackageJson, null, 4),
        "utf8"
    );
}

async function runNpmInstall(dir) {
    try {
        console.log("npm module install started");
        const { stdout, stderr } = await execAsync("npm install", { cwd: dir });
        console.log("npm module installed");
    } catch (err) {
        console.error(`npm install failed: ${err.message}`);
        throw err;
    }
}

export default async function createSveltePlugin(
    pluginDir,
    templateDir,
    pluginName,
    sdkPackageDir = null
) {
    const targetDir = path.join(pluginDir, "svelte-plugins", pluginName);

    try {
        await fs.access(targetDir);
        return { done: false, error: `${pluginName} is already exists.` };
    } catch {}

    await copyFolder(templateDir, targetDir);
    // await replacePluginName(targetDir, "my-plugin", pluginName);
    await makePackageJson(targetDir, pluginName, sdkPackageDir);

    console.log(`new plugin ${pluginName} is generated at ${targetDir}`);

    // await runNpmInstall(targetDir);
    console.log(`${pluginName} is ready.`);
    return { done: true, dir: targetDir };
}
