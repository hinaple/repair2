import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const PACKAGE_JSON_TEMPLATE = {
    version: "1.0.0",
    type: "module",
    scripts: {
        dev: "vite",
        build: "vite build && node move.js"
    },
    devDependencies: {
        "@sveltejs/vite-plugin-svelte": "^5.0.3",
        svelte: "^5.20.1",
        vite: "^6.1.0",
        "vite-plugin-css-injected-by-js": "^3.5.2"
    }
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

async function makePackageJson(pluginPath, pluginName) {
    const newPackageJson = { ...PACKAGE_JSON_TEMPLATE };
    newPackageJson.name = pluginName;
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

export default async function createSveltePlugin(pluginDir, templateDir, pluginName) {
    const targetDir = path.join(pluginDir, "svelte-plugins", pluginName);

    try {
        await fs.access(targetDir);
        return { done: false, error: `${pluginName} is already exists.` };
    } catch {}

    await copyFolder(templateDir, targetDir);
    // await replacePluginName(targetDir, "my-plugin", pluginName);
    await makePackageJson(targetDir, pluginName);

    console.log(`new plugin ${pluginName} is generated at ${targetDir}`);

    // await runNpmInstall(targetDir);
    console.log(`${pluginName} is ready.`);
    return { done: true, dir: targetDir };
}
