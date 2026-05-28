import { dialog, shell } from "electron";
import fs from "fs/promises";
import { join } from "path";
import { pluginDir, sdkDir, templateDir } from "../dirs";
import { pathExists } from "../pathExists";

const PLUGIN_SDK_VERSION = __SDK_VERSION__;
const SDK_NAME = "@fainthit/repair2-plugin-sdk";
const SCHEMA_PATH = `./node_modules/${SDK_NAME}/plugin-manifest.schema.json`;

const ENTRY_TYPE_MAP = {
    runtime: "runtime",
    "runtime-with-main": "runtime",
    element: "element",
    frame: "frame",
    function: "function",
    transition: "transition",
    "svelte-element": "element",
    "svelte-frame": "frame"
};

const DEFAULT_MANIFEST = {
    attributes: []
};

const MANIFEST_ENTRIES = {
    runtime: {
        steps: {}
    },
    "runtime-with-main": {
        main: {
            entry: "src/main/index.js",
            outDir: "dist/main"
        },
        entry: "src/renderer/index.js",
        outDir: "dist/renderer",
        steps: { testStep: ["arg"] }
    },
    "svelte-element": {
        svelte: true
    },
    "svelte-frame": {
        svelte: true
    }
};

function pluginNameValidate(name) {
    name = String(name)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    if (!name?.length) return { error: `${name} is invalid plugin name` };
    else return { name };
}

export async function createEmptyPlugin(
    name,
    entry,
    { link = false, root, templatePath = templateDir, skipNameValidation }
) {
    const type = ENTRY_TYPE_MAP[entry];
    if (!type) return { error: `Unknown plugin type: ${entry}` };

    if (!skipNameValidation) {
        const validateResult = pluginNameValidate(name);
        if (validateResult.error) return validateResult;
        name = validateResult.name;
    }

    const targetDir = join(link ? root : pluginDir, name);
    const alreadyExists = await pathExists(targetDir);
    if (alreadyExists) return { error: `${targetDir} is already exists` };
    const manifest = {
        $schema: SCHEMA_PATH,
        name,
        type,
        ...DEFAULT_MANIFEST,
        ...(MANIFEST_ENTRIES[entry] ?? {})
    };
    const pkg = {
        name,
        type: "module",
        devDependencies: {
            [SDK_NAME]: PLUGIN_SDK_VERSION,
            ...(manifest.svelte ? { svelte: __SVELTE_VERSION__ } : null)
        }
    };
    await fs.mkdir(targetDir, { recursive: true });
    const pluginTemplateDir = join(templatePath, "plugin-scaffold");
    await Promise.all([
        fs.writeFile(join(targetDir, "package.json"), JSON.stringify(pkg, null, 4), "utf8"),
        fs.writeFile(join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 4), "utf8"),
        fs.cp(join(pluginTemplateDir, "entries", entry), targetDir, { recursive: true }),
        fs.cp(join(pluginTemplateDir, "base"), targetDir, { recursive: true }),
        copyModule(targetDir, SDK_NAME)
    ]);
    console.log(`New ${entry} plugin created at: ${targetDir}.`);
    return { dir: targetDir };
}

function copyModule(targetDir, module) {
    return fs.cp(sdkDir, join(targetDir, "node_modules", module), {
        recursive: true
    });
}
